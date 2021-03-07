# markdown-it-external-preview
Markdown It plugin for external code preview

## Setup

- Install 

`npm install markdown-it-external-preview`, or 

`yarn add markdown-it-external-preview`

## Usage

```js
const markdown_it_external_preview = require('markdown-it-external-preview');
const options = {
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

let md = require('markdown-it')()
    .use(markdown_it_external_preview, options);

let result = md.render('[@external:code:github](https://github.com/milindsingh/magento2-grumphp/blob/2d9be8cf5c9da07256af5194370e9a9326e30881/module/grumphp.yml#L1-L134)');
console.log(result);

```