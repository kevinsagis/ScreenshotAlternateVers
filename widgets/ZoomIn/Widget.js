/*global define, dojo, dijit, require, esri, console, setTimeout*/
define(['dojo/_base/declare',
  'jimu/BaseWidget',
  'dojo/_base/html',
  'dojo/on',
'dojo/mouse',
'dojo/dom-style',
  'dojo/dom-construct',
  'dojo/dom-class',
  'esri/toolbars/navigation'
],
function(declare, BaseWidget, html, on, mouse, domStyle, domConstruct, domClass, Navigation) {
  var clazz = declare([BaseWidget], {
    name: 'ZoomIn',
    label: 'Zoom In',
    baseClass: 'jimu-widget-ZoomIn',
    
    startup: function() {
      this.inherited(arguments);
      var pnode = domConstruct.toDom("<div title='Zoom In' class='jimu-preload-widget-icon kevin-unselected' style='border-radius: 5px;'></div>");
      var node = domConstruct.toDom("<img src='widgets/ZoomIn/images/icon.png' style='width: 20px; height: 20px; margin: 5px;'></img>");
      html.place(node, pnode);
      html.place(pnode, this.domNode);
      var navToolbar = new Navigation(this.map);
      on(pnode, 'click', function(evt){
        if (domClass.contains(pnode, 'kevin-selected')){
          domClass.remove(pnode, "kevin-selected");
domStyle.set(pnode, "background-color", "rgba(0,0,0,0.2)");

          navToolbar.deactivate()
        }else{
          domClass.add(pnode, "kevin-selected");
  domStyle.set(pnode, "background-color", "rgba(0,0,0,0.9)");
          navToolbar.activate(Navigation.ZOOM_IN);
        }

        console.info('button clicked');
      });
    }
  });

  clazz.hasStyle = false;
  clazz.hasUIFile = false;
  clazz.hasLocale = false;
  clazz.hasConfig = false;
  clazz.inPanel = false;
  return clazz;
});