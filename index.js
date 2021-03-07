const request = require('sync-request');
const buffer = require('buffer');
const bn = require("browser-or-node");

// @[external:code:github](https://github.com/username/repository/blob/2d9be8cf5c9da07256af5194370e9a9326e30881/folder/filename.ext#L1-L134)
const defaults = {
    code: {
        use_prism: true,
        add_container: true,
        container: {
            class_prefix: "external-preview",
            class1: "flex flex-align-top",
            class2: "frame",
            add_header: true,
            header: {
                class: "header flex hide-for-small",
                add_dots: true,
                dots: {
                    class: "buttons",
                    count: 3
                },
                add_title: true,
                title: {
                    add_link: true,
                    class: "header-title"
                }
            },
            code: {
                class: "code",
            }
        },
        github: {
            only_selected_lines: true,
            replacement_host: "raw.githubusercontent.com"
        },
        type: null
    }
};

const EXTERNAL_PREVIEW_REGEX = /\[(@[a-zA-Z].+)]\([\s]*(.*?)[\s]*[)]/im;
const EXTERNAL_PREVIEW_LINE_NUMBER_REGEX = /(#L(\d*)-L(\d*))|(#L(\d*))/im;

function externalPreview(md, options)
{
    return (state, silent) => {
        // console.log(state)
        // console.log(silent)
        // console.log(state.src.slice(state.pos, state.src.length))
        let contentUrl;
        let previewPath;

        let serviceEnd;
        let serviceStart;
        let token;
        let theState = state;
        const oldPos = state.pos;

        if (state.src.charCodeAt(oldPos) !== 0x5B/* @ */ ||
            state.src.charCodeAt(oldPos + 1) !== 0x40/* [ */) {
            return false;
        }

        const match = EXTERNAL_PREVIEW_REGEX.exec(state.src.slice(state.pos, state.src.length));

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
        if (typeof content !== "string" && buffer.Buffer.isBuffer(content)) {
            content = content.toString();
        }

        content = extract(options, state, content);

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

function externalPreviewTokenize(md, options)
{
    return (tokens, idx) => {
        // code/link
        const type = md.utils.escapeHtml(tokens[idx].externalPreviewType).toLowerCase();
        // github/gitlab/bitbucket
        const service = md.utils.escapeHtml(tokens[idx].externalPreviewService).toLowerCase();
        // text/markdown
        let content = tokens[idx].externalPreviewContent;
        if (type === 'code') {
            let language = options.code.type ? options.code.type : getLanguage(tokens[idx].externalPreviewPath);
            let code;
            if (options.code.use_prism && bn.isNode) {
                const Prism = require('prismjs');

                // load all grammars
                require("prismjs/components/")();

                // optimize loading of grammar
                // const loadLanguages = require('prismjs/components/index.js');
                // loadLanguages([language]);

                if (Prism.languages[language]) {
                    content = Prism.highlight(content, Prism.languages[language], language);
                } else {
                    content = Prism.util.encode(content);
                }
            }

            let cssClassPrefix = options.code.container.class_prefix;
            let cssClass = options.code.container.code.class;
            code = `<div class="${cssClassPrefix} ${cssClass}">
                        <div>
                            <pre class="language-${language}">
                                <code class="language-${language}">${content}</code>
                            </pre>
                        </div>
                     </div>`;
            return build(options, code, tokens[idx].externalPreviewPath, tokens[idx].externalPreviewUrl);
        }

        content = `<div>${content}</div>`;
        return build(options, content, tokens[idx].externalPreviewPath, tokens[idx].externalPreviewUrl);
    }
}

function build(options, content, path, url)
{
    let result = content;
    if (options.code.add_container) {
        let cssClassPrefix = defaults.code.container.class_prefix;
        let header = "";
        if (options.code.container.add_header) {
            let dots = "";
            if (options.code.container.header.add_dots) {
                let inside = "";
                for (let i = 0; i < options.code.container.header.dots.count; i++) {
                    inside += "<div></div>"
                }
                dots = `<div class="${cssClassPrefix} ${options.code.container.header.dots.class}">
                            ${inside}
                        </div>`
            }

            let title = "";
            if (options.code.container.header.add_title) {
                let link = path;
                if (options.code.container.header.title.add_link) {
                    link = `<a rel="noopener noreferrer" target="_blank" href="${url}">${path}</a>`;
                }
                title = `<div class="${cssClassPrefix} ${options.code.container.header.title.class}">${link}</div>`;
            }

            header = `<div class="${cssClassPrefix} ${options.code.container.header.class}">
                          ${dots}
                          ${title}
                      </div>`;
        }
        result = `<div class="${cssClassPrefix} ${options.code.container.class1}">
                    <div class="${cssClassPrefix} ${options.code.container.class2}">
                        ${header}
                        ${result}
                    </div>
                  </div>`;
    }
    return result;
}

function extract(options, state, content)
{
    if (typeof content === "string") {
        const lines = EXTERNAL_PREVIEW_LINE_NUMBER_REGEX.exec(state.src.slice(state.pos, state.src.length));
        let start, end;
        if (lines[5] !== undefined) {
            start = parseInt(lines[5]);
            end = parseInt(lines[5]);
        }

        if (lines[2] !== undefined && lines[3] !== undefined) {
            start = parseInt(lines[2]);
            end = parseInt(lines[3]);
        }

        if (start && end && options.code.github.only_selected_lines) {
            let lines = content.split('\n');
            lines = lines.slice(start-1, end);
            content = lines.join('\n');
        }
    }

    return content;
}

function getLanguage(url)
{
    let extension = url.split(/[#?]/)[0].split('.').pop().trim();
    let language = extension;
    if (extension === "js") {
        language = "javascript";
    }

    if (extension === "yml") {
        language = "yaml";
    }
    return language;
}

module.exports = function external_preview_plugin(md, options)
{
    if (options) {
        Object.keys(defaults).forEach(function checkForKeys(key)
        {
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