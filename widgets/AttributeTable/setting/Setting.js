///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidgetSetting',
    'jimu/dijit/SimpleTable',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojo/_base/array',
    'dojo/on',
    'dojo/Deferred',
    "dojo/query",
    "jimu/dijit/Popup",
    'jimu/dijit/Message',
    "jimu/dijit/LoadingShelter",
    "../utils"
  ],
  function(
    declare,
    _WidgetsInTemplateMixin,
    BaseWidgetSetting,
    Table,
    lang,
    html,
    array,
    on,
    Deferred,
    query,
    Popup,
    Message,
    LoadingShelter,
    utils
  ) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      //these two properties is defined in the BaseWidget
      baseClass: 'jimu-widget-attributetable-setting',
      currentFieldTable: null,
      _allLayerFields: null,
      _layerInfos: null,
      _tableInfos: null,
      _delayedLayerInfos: null,
      _delayedLayerInfosAfterInit: null,
      _unSpportQueryCampsite: null,

      startup: function() {
        this.inherited(arguments);
        if (!this.config.layerInfos) {
          this.config.layerInfos = [];
        }
        this._allLayerFields = [];
        this._layerInfos = [];
        this._tableInfos = [];
        this._delayedLayerInfos = [];
        this._delayedLayerInfosAfterInit = [];
        this._unSpportQueryCampsite = {};

        var fields = [{
          name: 'show',
          title: this.nls.show,
          width: 'auto',
          type: 'checkbox',
          'class': 'show'
        }, {
          name: 'label',
          title: this.nls.label,
          width: '60%',
          type: 'text'
        }, {
          name: 'url',
          title: 'url',
          type: 'text',
          hidden: true
        }, {
          name: 'index',
          title: 'index',
          type: 'text',
          hidden: true
        }, {
          name: 'actions',
          title: this.nls.actions,
          type: 'actions',
          width: '20%',
          actions: ['edit'],
          'class': 'symbol'
        }];

        var args = {
          fields: fields,
          selectable: true,
          autoHeight: false
        };
        this.displayFieldsTable = new Table(args);
        this.displayFieldsTable.placeAt(this.tableLayerInfos);
        html.setStyle(this.displayFieldsTable.domNode, {
          'height': '100%'
        });
        this.displayFieldsTable.startup();

        this.shelter = new LoadingShelter({
          hidden: true
        });
        this.shelter.placeAt(this.domNode.parentNode.parentNode || this.domNode);
        this.shelter.startup();
        this.shelter.show();

        utils.readLayerInfosObj(this.map).then(lang.hitch(this, function(layerInfosObj) {
          this.own(layerInfosObj.on(
            'layerInfosChanged',
            lang.hitch(this, this.onLayerInfosChanged)
          ));

          this.own(on(
            this.displayFieldsTable,
            'actions-edit',
            lang.hitch(this, this.editFieldsClick)
          ));
          this.own(on(
            this.displayFieldsTable,
            'row-click',
            lang.hitch(this, this._verifiedOnShowClick)
          ));

          this.setConfig(this.config);
        }));
      },


      editFieldsClick: function(tr) {
        var tds = query(".action-item-parent", tr);
        var data;
        if (tds && tds.length) {
          data = this.displayFieldsTable.getRowData(tr);
          if (!data.show) {
            var popup = new Message({
              message: this.nls.warning,
              buttons: [{
                label: this.nls.ok,
                onClick: lang.hitch(this, function() {
                  popup.close();
                })
              }]
            });
          } else {
            var rowIndex = parseInt(data.index, 10);
            this.shelter.show();
            this._getLayerFields(rowIndex).then(lang.hitch(this, function(fields) {
              this.openFieldsDialog(tr, fields, rowIndex);
            }), lang.hitch(this, function(err) {
              console.error(err);
            })).always(lang.hitch(this, function() {
              this.shelter.hide();
            }));
          }
        }
      },

      _verifiedOnShowClick: function(tr) {
        var rowData = this.displayFieldsTable.getRowData(tr);
        var idx = parseInt(rowData.index, 10);
        var layerInfo = null;
        if (this.config && this.config.layerInfos && this.config.layerInfos.length > 0) {
          layerInfo = this.config.layerInfos[idx];
        } else {
          layerInfo = this._layerInfos[idx];
        }

        var _layerNames = this._unSpportQueryCampsite.layerNames;
        var unSupportQuery = _layerNames.indexOf(layerInfo.name || layerInfo.title) > -1;

        if (rowData.show && unSupportQuery) {
          new Message({
            message: this.nls.unsupportQueryWarning
          });

          rowData.show = false;
          this.displayFieldsTable.editRow(tr, rowData);
        }
      },

      _getLayerFields: function(rowIndex) {
        var def = new Deferred();
        var fields = this._allLayerFields[rowIndex];
        if (fields) {
          def.resolve(fields);
        } else {
          this._layerInfos[rowIndex].getLayerObject().then(lang.hitch(this, function(layer) {
            if (layer.fields) {
              def.resolve(layer.fields);
            } else {
              def.reject();
            }
          }), lang.hitch(this, function(err) {
            def.reject(err);
          }));
        }

        return def;
      },

      openFieldsDialog: function(tr, fields, idx) {
        /*jshint unused:false*/
        var table = this._createFieldsTable(fields, idx);
        this.currentFieldTable = table;
        this.own(on(table, 'row-click', lang.hitch(this, function(tr) {
          var fields = table.getData();
          var atLeastOne = array.some(fields, lang.hitch(this, function(field) {
            return field.show;
          }));
          if (!atLeastOne) {
            new Message({
              message: this.nls.fieldCheckWarning
            });
            var rowData = table.getRowData(tr);
            if (rowData) {
              rowData.show = true;
              table.editRow(tr, rowData);
            }
          }
        })));

        var fieldsPopup = new Popup({
          titleLabel: this.nls.configureLayerFields,
          width: 640,
          maxHeight: 600,
          autoHeight: true,
          content: table,
          buttons: [{
            label: this.nls.ok,
            onClick: lang.hitch(this, function() {
              this._allLayerFields[idx] = table.getData();
              fieldsPopup.close();
              fieldsPopup = null;
            })
          }, {
            label: this.nls.cancel,
            onClick: lang.hitch(this, function() {
              fieldsPopup.close();
              fieldsPopup = null;
            })
          }],
          onClose: function() {
            fieldsPopup = null;
          }
        });
      },

      _createFieldsTable: function(lFields) {
        var fields = [{
          name: 'show',
          title: this.nls.fieldVisibility,
          type: 'checkbox',
          'class': 'show'
        }, {
          name: 'name',
          title: this.nls.fieldName,
          type: 'text'
        }, {
          name: 'alias',
          title: this.nls.fieldAlias,
          editable: true,
          type: 'text'
        }, {
          name: 'actions',
          title: this.nls.fieldActions,
          type: 'actions',
          actions: ['up', 'down'],
          'class': 'symbol'
        }];

        var args = {
          fields: fields,
          selectable: true,
          autoHeight: false,
          style: {
            'height': '300px',
            'maxHeight': '300px'
          }
        };
        var fieldsTable = new Table(args);

        for (var i = 0; i < lFields.length; i++) {
          if (lFields[i].show === undefined) {
            lFields[i].show = true;
          } else {
            lFields[i].show = !!lFields[i].show;
          }

          fieldsTable.addRow(lFields[i]);
        }

        return fieldsTable;
      },

      setConfig: function(config) {
        this.config = config;
        this.displayFieldsTable.clear();
        this._allLayerFields = [];

        this._processTableData().then(lang.hitch(this, function(layerInfos) {
          this._init(layerInfos);
          this.shelter.hide();
        }), lang.hitch(this, function(err) {
          new Message({
            message: err.message || err
          });
        }));
      },

      onLayerInfosChanged: function(layerInfo, changeType, layerInfoSelf) {
        if ('added' !== changeType || !layerInfoSelf || !layerInfo) {
          return;
        }
        //GeoRss, kml,etc...
        layerInfoSelf.getSupportTableInfo().then(lang.hitch(this, function(supportTableInfo) {
          if (supportTableInfo.isSupportedLayer) {
            if (this._layerInfos && this._layerInfos.length === 0) {
              this._delayedLayerInfos.push(layerInfoSelf);
            } else if (this._layerInfos && this._layerInfos.length > 0 &&
              !this._getLayerInfoById(layerInfoSelf.id)) { // setting table complete
              this._delayedLayerInfosAfterInit.push(layerInfoSelf);
              this._processDelayedLayerInfosAfterInit(this._delayedLayerInfosAfterInit);
            }
          }
        }));
      },

      // must be invoke after initialize this._layerInfos
      _processDelayedLayerInfosAfterInit: function(layerInfos) {
        var count = this._layerInfos.length;
        for (var i = 0; i < layerInfos.length; i++) {
          var _configLayerInfo = utils.getConfigInfoFromLayerInfo(layerInfos[i]);
          var show = _configLayerInfo.show;
          this.displayFieldsTable.addRow({
            label: _configLayerInfo.name || _configLayerInfo.title,
            url: _configLayerInfo.layer.url,
            index: "" + (count + i),
            show: show
          });

          this._allLayerFields.push(_configLayerInfo.layer.fields);
          this._layerInfos.push(layerInfos[i]); // this case un get tableInfo
        }
      },

      _processDelayedLayerInfos: function() { // must be invoke after initialize this._layerInfos
        if (this._delayedLayerInfos.length > 0) {
          array.forEach(this._delayedLayerInfos, lang.hitch(this, function(delayedLayerInfo) {
            if (!this._getLayerInfoById(delayedLayerInfo.id)) {
              this._layerInfos.push(delayedLayerInfo);
            }
          }));

          this._delayedLayerInfos = [];
        }
      },

      _processTableData: function() {
        var def = new Deferred();

        utils.readConfigLayerInfosFromMap(this.map).then(lang.hitch(this, function(layerInfos) {
          this._layerInfos = layerInfos;
          this._processDelayedLayerInfos();

          utils.readSupportTableInfoFromLayerInfos(this._layerInfos)
            .then(lang.hitch(this, function(tableInfos) {
              this._tableInfos = tableInfos;

              if (this.config && this.config.layerInfos && this.config.layerInfos.length > 0) {
                var _cLayerInfos = array.filter( // remove layerInfo not in webmap.
                  this.config.layerInfos,
                  lang.hitch(this, function(layerInfo) {
                    return this._getLayerInfoById(layerInfo.id);
                  }));
                this.config.layerInfos = _cLayerInfos;

                this._unSpportQueryCampsite.fromConfig = true;
                this._unSpportQueryCampsite.layerNames = this._getUnsupportQueryLayerNames(
                  this.config.layerInfos
                );

                def.resolve(_cLayerInfos);
              } else {
                this._unSpportQueryCampsite.fromConfig = false;
                this._unSpportQueryCampsite.layerNames = this._getUnsupportQueryLayerNames(
                  this._layerInfos
                );

                def.resolve(utils.getConfigInfosFromLayerInfos(layerInfos));
              }
            }), function(err) {
              console.error(err);
              def.reject(err);
            });
        }), lang.hitch(this, function(err) {
          console.error(err);
          def.reject(err);
        }));
        return def;
      },

      _getUnsupportQueryLayerNames: function(layerInfos) {
        var _unSpportQueryLayerNames = [];
        array.forEach(layerInfos, lang.hitch(this, function(layerInfo) {
          var _tableInfo = this._getSupportTableInfoById(layerInfo.id);
          // TODO: need to get _tableInfo if layerInfo come from _processDelayedLayerInfosAfterInit
          if (_tableInfo && !_tableInfo.isSupportQuery) {
            _unSpportQueryLayerNames.push(layerInfo.name || layerInfo.title);
          }
        }));
        return _unSpportQueryLayerNames;
      },

      _init: function(layerInfos) {
        var unSupportQueryLayerNames = [];
        for (var i = 0; i < layerInfos.length; i++) {
          var show = layerInfos[i].show &&
            this._getSupportTableInfoById(layerInfos[i].id).isSupportQuery;
          this.displayFieldsTable.addRow({
            label: layerInfos[i].name || layerInfos[i].title,
            url: layerInfos[i].layer.url,
            index: "" + i,
            show: show
          });

          this._allLayerFields.push(layerInfos[i].layer.fields);

          if (this._unSpportQueryCampsite.fromConfig) {
            var _layerNames = this._unSpportQueryCampsite.layerNames;
            var nowUnsupport = _layerNames &&
              (_layerNames.indexOf(layerInfos[i].name || layerInfos[i].title) > -1);
            if (layerInfos[i].show && nowUnsupport) {
              unSupportQueryLayerNames.push(layerInfos[i].name || layerInfos[i].title);
            }
          }
        }

        if (this._unSpportQueryCampsite.fromConfig && unSupportQueryLayerNames.length > 0) {
          new Message({
            message: this.nls.unsupportQueryLayers + "<br><br>" +
              unSupportQueryLayerNames.toString()
          });
        }

        if (this.config.hideExportButton) {
          this.exportcsv.uncheck();
        } else {
          this.exportcsv.check();
        }

        if (this.config.initiallyExpand) {
          this.expand.check();
        } else {
          this.expand.uncheck();
        }

        // if attribute table can use openAtStart,
        // keep initiallyExpand same with openAtStart and keep checkbox read only.
        if (this._canUseOpenAtStart()) {
          if (this.openAtStart) {
            this.expand.check();
          } else {
            this.expand.uncheck();
          }

          this.expand.status = false;
          html.addClass(this.expand.domNode, 'disable-checkbox');
        }
      },

      _canUseOpenAtStart: function() {
        return this.closeable || !this.isOnScreen;
      },

      _getLayerInfoById: function(layerId) {
        for (var i = 0, len = this._layerInfos.length; i < len; i++) {
          if (this._layerInfos[i].id === layerId) {
            return this._layerInfos[i];
          }
        }
      },

      _getSupportTableInfoById: function(layerId) {
        for (var i = 0, len = this._tableInfos.length; i < len; i++) {
          if (this._tableInfos[i].id === layerId) {
            return this._tableInfos[i];
          }
        }
      },

      getConfig: function() {
        var data = this.displayFieldsTable.getData();
        var table = [];
        var len = data.length;
        if (this.config && this.config.layerInfos && this.config.layerInfos.length > 0) {
          array.forEach(data, lang.hitch(this, function(tData, idx) {
            tData = tData; // do nothing
            var lInfo = this.config.layerInfos[idx];
            var json = {};

            json.name = lInfo.name || lInfo.title; // prevent mess code
            json.id = lInfo.id;
            json.layer = {};
            json.layer.url = data[idx].url;
            json.layer.fields = this._allLayerFields[idx];
            json.show = data[idx].show;
            table.push(json);
          }));
        } else {
          for (var i = 0; i < len; i++) {
            var json = {};
            json.name = this._layerInfos[i].name || this._layerInfos[i].title; // prevent mess code
            json.id = this._layerInfos[i].id;
            json.layer = {};
            json.layer.url = data[i].url;
            json.layer.fields = this._allLayerFields[i];
            json.show = data[i].show;
            table.push(json);
          }
        }


        this.config.layerInfos = table;
        this.config.hideExportButton = !this.exportcsv.getValue();

        if (!this._canUseOpenAtStart()) {
          this.config.initiallyExpand = this.expand.getValue();
        }// else never change the property.

        return this.config;
      }
    });
  });