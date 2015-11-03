
define(['dojo/_base/declare',
    'dojo/_base/html',
    'dojo/query',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget'
  ],
  function(declare, html, query, _WidgetsInTemplateMixin, BaseWidget) {
    var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
      baseClass: 'jimu-widget-screenshot',

      _hasContent: null,

      postCreate: function() {
        this.inherited(arguments);

        this._hasContent = this.config.about && this.config.about.aboutContent;
      },

      startup: function() {
        this.inherited(arguments);

        this.resize();
      },

      resize: function() {
        this._resizeContentImg();
      },

      _resizeContentImg: function() {
        var customBox = html.getContentBox(this.customContentNode);

        if (this._hasContent) {
          html.empty(this.customContentNode);

          var aboutContent = html.toDom(this.config.about.aboutContent);
          // DocumentFragment or single node
          if (aboutContent.nodeType &&
            (aboutContent.nodeType === 11 || aboutContent.nodeType === 1)) {
            var contentImgs = query('img', aboutContent);
            if (contentImgs && contentImgs.length) {
              contentImgs.style({
                maxWidth: (customBox.w - 20) + 'px' // prevent x scroll
              });
            } else if (aboutContent.nodeName.toUpperCase() === 'IMG') {
              html.setStyle(aboutContent, 'maxWidth', (customBox.w - 20) + 'px');
            }
          }
          html.place(aboutContent, this.customContentNode);
        }
      }
    });
    return clazz;
  });