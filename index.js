const request = require('sync-request');

// @[external:code:github](https://github.com/username/repository/blob/2d9be8cf5c9da07256af5194370e9a9326e30881/folder/filename.ext#L1-L134)
const defaults = {
    code: {
        github: {
            replacement_host: "raw.githubusercontent.com"
        }
    }
};

const EMBED_REGEX = /@\[([a-zA-Z].+)]\([\s]*(.*?)[\s]*[)]/im;

function externalPreview(md, options) {
    return (state, silent) => {
        let contentUrl;
        let previewPath;

        let serviceEnd;
        let serviceStart;
        let token;
        let theState = state;
        const oldPos = state.pos;

        if (state.src.charCodeAt(oldPos) !== 0x40/* @ */ ||
            state.src.charCodeAt(oldPos + 1) !== 0x5B/* [ */) {
            return false;
        }

        const match = EMBED_REGEX.exec(state.src.slice(state.pos, state.src.length));

        if (!match || match.length < 3) {
            return false;
        }

        const label = match[1];
        let url = match[2];
        const [external, type, service] = label.split(":");

        // replace url for github
        if (service === 'github' && options['code']['github']['replacement_host']) {
            previewPath = url.replace(/\/blob\/(.*?)\//, '/');
            contentUrl = url.replace(/\/\/github\.com/, '//' + options['code']['github']['replacement_host']).replace(/\/blob\//, '/');
        }

        // load external content
        let response = request('GET', contentUrl);
        let content = response.getBody();

        serviceStart = oldPos + 2;
        serviceEnd = md.helpers.parseLinkLabel(state, oldPos + 1, false);

        // We found the end of the link, and know for a fact it's a valid link;
        // so all that's left to do is to call tokenizer.
        if (!silent) {
            theState.pos = serviceStart;
            theState.service = theState.src.slice(serviceStart, serviceEnd);
            const newState = new theState.md.inline.State(service, theState.md, theState.env, []);
            newState.md.inline.tokenize(newState);

            token = theState.push('external_preview', '');
            token.externalPreviewType = type;
            token.externalPreviewService = service;
            token.externalPreviewContent = content;
            token.externalPreviewPath = previewPath;
            token.externalPreviewUrl = url;
            token.level = theState.level;
        }

        theState.pos += theState.src.indexOf(')', theState.pos);
        return true;
    }
}

function externalPreviewTokenize(md, options) {
    return (tokens, idx) => {
        // code/link
        const type = md.utils.escapeHtml(tokens[idx].externalPreviewType).toLowerCase();
        // github/gitlab/bitbucket
        const service = md.utils.escapeHtml(tokens[idx].externalPreviewService).toLowerCase();
        // text/markdown
        const content = tokens[idx].externalPreviewContent;
        if (type === 'code') {
            return "<pre>"+content+"</pre>"
        }

        return "<div>"+content+"</div>";
    }
}

module.exports = function external_preview_plugin(md, options) {
    if (options) {
        Object.keys(defaults).forEach(function checkForKeys(key) {
            if (typeof options[key] === 'undefined') {
                options[key] = defaults[key];
            }
        });
    } else {
        options = defaults;
    }

    md.renderer.rules.external_preview = externalPreviewTokenize(md, options);
    md.inline.ruler.before('emphasis', 'external_preview', externalPreview(md, options));
}