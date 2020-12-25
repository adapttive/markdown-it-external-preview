const request = require('sync-request');
const buffer = require('buffer');
const bn = require("browser-or-node");

// @[external:code:github](https://github.com/username/repository/blob/2d9be8cf5c9da07256af5194370e9a9326e30881/folder/filename.ext#L1-L134)
const defaults = {
    code: {
        use_prism: true,
        add_container: true,
        container: {
            class1: "examples flex flex-align-top",
            class2: "examples__frame",
            add_header: true,
            header: {
                class: "examples__header flex hide-for-small",
                add_dots: true,
                dots: {
                    class: "examples__buttons",
                    count: 3
                },
                add_title: true,
                title: {
                    add_link: true,
                    class: "examples__header-title"
                }
            },
            code: {
                class: "examples__code",
            }
        },
        github: {
            replacement_host: "raw.githubusercontent.com"
        },
        type: null
    }
};

const EMBED_REGEX = /@\[([a-zA-Z].+)]\([\s]*(.*?)[\s]*[)]/im;

function externalPreview(md, options)
{
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
        if (typeof content !== "string" && buffer.Buffer.isBuffer(content)) {
            content = content.toString();
        }
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

            code = `<div class="examples__code">
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
        let header = "";
        if (options.code.container.add_header) {
            let dots = "";
            if (options.code.container.header.add_dots) {
                let inside = "";
                for (let i = 0; i < options.code.container.header.dots.count; i++) {
                    inside += "<div></div>"
                }
                dots = `<div class="${options.code.container.header.dots.class}">
                            ${inside}
                        </div>`
            }

            let title = "";
            if (options.code.container.header.add_title) {
                let link = path;
                if (options.code.container.header.title.add_link) {
                    link = `<a href="${url}">${path}</a>`;
                }
                title = `<div class="${options.code.container.header.title.class}">${link}</div>`;
            }

            header = `<div class="${options.code.container.header.class}">
                          ${dots}
                          ${title}
                      </div>`;
        }
        result = `<div class="${options.code.container.class1}">
                    <div class="${options.code.container.class2}">
                        ${header}
                        ${result}
                    </div>
                  </div>`;
    }
    return result;
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