const markdown_it_external_preview = require('./index');

let md = require('markdown-it')()
    .use(markdown_it_external_preview);

let result = md.render('@[external:code:github](https://github.com/milindsingh/magento2-grumphp/blob/2d9be8cf5c9da07256af5194370e9a9326e30881/module/grumphp.yml#L1-L134)');
console.log(result);
