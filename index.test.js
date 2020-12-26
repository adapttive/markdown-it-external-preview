const markdown_it_external_preview = require('./index');
let md = require('markdown-it')().use(markdown_it_external_preview);
test("validate external:code:github render", () => {
  expect(md.render('@[external:code:github](https://github.com/milindsingh/magento2-grumphp/blob/2d9be8cf5c9da07256af5194370e9a9326e30881/project/grumphp.yml#L1)').trim()).toBe(
      '<p><div class="external-preview flex flex-align-top">\n' +
      '                    <div class="external-preview frame">\n' +
      '                        <div class="external-preview header flex hide-for-small">\n' +
      '                          <div class="external-preview buttons">\n' +
      '                            <div></div><div></div><div></div>\n' +
      '                        </div>\n' +
      '                          <div class="external-preview header-title"><a rel="noopener noreferrer" target="_blank" href="https://github.com/milindsingh/magento2-grumphp/blob/2d9be8cf5c9da07256af5194370e9a9326e30881/project/grumphp.yml#L1">https://github.com/milindsingh/magento2-grumphp/project/grumphp.yml#L1</a></div>\n' +
      '                      </div>\n' +
      '                        <div class="external-preview code">\n' +
      '                        <div>\n' +
      '                            <pre class="language-yaml">\n' +
      '                                <code class="language-yaml"><span class="token comment"># Project level GrumPHP configuration for Magento 2</span></code>\n' +
      '                            </pre>\n' +
      '                        </div>\n' +
      '                     </div>\n' +
      '                    </div>\n' +
      '                  </div></p>'
  );
});
