const Const = require('./Const')
const geomUtils = require('./geomUtils')
const bbIdxBuilder = require('./bbIdxBuilder')

const utils = require('./utils')
const BoundsItem = require('./BoundsItem')
const topojson = require('./topojson-client')
const SphericalMercator = require('./SphericalMercator')
const AreaNode = require('./AreaNode')
const distDataParser = require('./distDataParser')

module.exports = (
  function (require, EventCls, utils, Const, distDataParser, AreaNode) {
    function DistrictExplorer(opts) {
      this._opts = utils.extend(
        {
          distDataLoc: "./assets/d_v2",
          eventSupport: !1,
          keepFeaturePolygonReference: !0,
          mouseEventNames: ["click"],
          mousemoveDebounceWait: -1,
        },
        opts
      );
      DistrictExplorer.__super__.constructor.call(this, this._opts);
      this._hoverFeature = null;
      this._areaNodesForLocating = null;
      this._areaNodeCache = globalAreaNodeCache;
      this._renderedPolygons = [];
      this._opts.preload && this.loadMultiAreaNodes(this._opts.preload);
      this._debouncedHandleMousemove =
        this._opts.mousemoveDebounceWait > 1
          ? utils.debounce(
              this._handleMousemove,
              this._opts.mousemoveDebounceWait
            )
          : this._handleMousemove;
      this._opts.map && this._opts.eventSupport && this._bindMapEvents(!0);
    }
    var globalAreaNodeCache = {};
    utils.inherit(DistrictExplorer, EventCls);
    utils.extend(DistrictExplorer.prototype, {
      setAreaNodesForLocating: function (areaNodes) {
        areaNodes
          ? utils.isArray(areaNodes) || (areaNodes = [areaNodes])
          : (areaNodes = []);
        this._areaNodesForLocating = areaNodes || [];
      },
      getLocatedSubFeature: function (position) {
        var areaNodes = this._areaNodesForLocating;
        if (!areaNodes) return null;
        for (var i = 0, len = areaNodes.length; i < len; i++) {
          var feature = areaNodes[i].getLocatedSubFeature(position);
          if (feature) return feature;
        }
        return null;
      },
      getLocatedFeature: function (position) {
        var areaNodes = this._areaNodesForLocating;
        if (!areaNodes) return null;
        for (var i = 0, len = areaNodes.length; i < len; i++) {
          var feature = areaNodes[i].getLocatedFeature(position);
          if (feature) return feature;
        }
        return null;
      },
      setMap: function (map) {
        var oldMap = this._opts.map;
        if (oldMap !== map) {
          this.offMapEvents();
          this._opts.map = map;
          this._opts.map && this._opts.eventSupport && this._bindMapEvents(!0);
        }
      },
      offMapEvents: function () {
        this._bindMapEvents(!1);
      },
      _bindMapEvents: function (on) {
        for (
          var map = this._opts.map,
            action = on ? "on" : "off",
            mouseEventNames = this._opts.mouseEventNames,
            i = 0,
            len = mouseEventNames.length;
          i < len;
          i++
        )
          map[action](mouseEventNames[i], this._handleMouseEvent, this);
        AMap.UA.mobile ||
          map[action]("mousemove", this._debouncedHandleMousemove, this);
      },
      _handleMouseEvent: function (e) {
        var feature = this.getLocatedFeature(e.lnglat);
        this.triggerWithOriginalEvent(
          (feature ? "feature" : "outside") + utils.ucfirst(e.type),
          e,
          feature
        );
      },
      _handleMousemove: function (e) {
        var feature = this.getLocatedFeature(e.lnglat);
        this.setHoverFeature(feature, e);
        feature &&
          this.triggerWithOriginalEvent("featureMousemove", e, feature);
      },
      setHoverFeature: function (feature, e) {
        var oldHoverFeature = this._hoverFeature;
        if (feature !== oldHoverFeature) {
          oldHoverFeature &&
            this.triggerWithOriginalEvent(
              "featureMouseout",
              e,
              oldHoverFeature
            );
          this._hoverFeature = feature;
          feature &&
            this.triggerWithOriginalEvent(
              "featureMouseover",
              e,
              feature,
              oldHoverFeature
            );
          this.triggerWithOriginalEvent(
            "hoverFeatureChanged",
            e,
            feature,
            oldHoverFeature
          );
        }
      },
      _loadJson: function (src, callback) {
        var self = this;
        return require(["json!" + src], function (data) {
          callback && callback.call(self, null, data);
        }, function (error) {
          if (!callback) throw error;
          callback(error);
        });
      },
      _getAreaNodeDataFileName: function (adcode) {
        return "an_" + adcode + ".json";
      },
      _getAreaNodeDataSrc: function (adcode) {
        return (
          this._opts.distDataLoc + "/" + this._getAreaNodeDataFileName(adcode)
        );
      },
      _isAreaNodeJsonId: function (id, adcode) {
        return (
          id.indexOf(!1) &&
          id.indexOf(this._getAreaNodeDataFileName(adcode)) > 0
        );
      },
      _undefAreaNodeJson: function (adcode) {
        var id = AMapUI.findDefinedId(function (id) {
          return this._isAreaNodeJsonId(id, adcode);
        }, this);
        if (id) {
          AMapUI.require.undef(id);
          return !0;
        }
        return !1;
      },
      loadAreaTree: function (callback) {
        this._loadJson(this._opts.distDataLoc + "/area_tree.json", callback);
      },
      loadCountryNode: function (callback) {
        this.loadAreaNode(Const.ADCODES.COUNTRY, callback);
      },
      loadMultiAreaNodes: function (adcodes, callback) {
        function buildCallback(i) {
          return function (error, areaNode) {
            if (!done) {
              left--;
              if (error) {
                callback && callback(error);
                done = !0;
              } else {
                results[i] = areaNode;
                0 === left && callback && callback(null, results);
              }
            }
          };
        }
        if (adcodes && adcodes.length)
          for (
            var len = adcodes.length,
              left = len,
              results = [],
              done = !1,
              i = 0;
            i < len;
            i++
          )
            this.loadAreaNode(adcodes[i], callback ? buildCallback(i) : null);
        else callback && callback(null, []);
      },
      loadAreaNode: function (adcode, callback, thisArg, canSync) {
        thisArg = thisArg || this;
        if (this._areaNodeCache[adcode]) {
          if (callback) {
            var areaNode = this._areaNodeCache[adcode];
            canSync
              ? callback.call(thisArg, null, areaNode, !0)
              : setTimeout(function () {
                  callback.call(thisArg, null, areaNode);
                }, 0);
          }
        } else
          this._loadJson(
            this._getAreaNodeDataSrc(adcode),
            function (err, data) {
              if (err) callback && callback.call(thisArg, err);
              else {
                this._buildAreaNode(adcode, data);
                callback &&
                  callback.call(thisArg, null, this._areaNodeCache[adcode]);
              }
            }
          );
      },
      getLocalAreaNode: function (adcode) {
        return this._areaNodeCache[adcode] || null;
      },
      locatePosition: function (lngLat, callback, opts) {
        opts = utils.extend(
          {
            levelLimit: 10,
          },
          opts
        );
        var parentNode = opts.parentNode;
        parentNode
          ? this._routeLocate(lngLat, parentNode, [], callback, opts)
          : this.loadCountryNode(function (err, countryNode) {
              err
                ? callback && callback(err)
                : this._routeLocate(lngLat, countryNode, [], callback, opts);
            });
      },
      _routeLocate: function (lngLat, parentNode, routes, callback, opts) {
        var subFeature = parentNode.getLocatedSubFeature(lngLat),
          gotChildren = !1;
        if (subFeature) {
          routes.pop();
          routes.push(parentNode.getParentFeature());
          routes.push(subFeature);
          gotChildren = parentNode.doesFeatureHasChildren(subFeature);
        }
        gotChildren && routes.length < opts.levelLimit
          ? this.loadAreaNode(
              parentNode.getAdcodeOfFeature(subFeature),
              function (err, subNode) {
                err
                  ? callback && callback(err)
                  : this._routeLocate(lngLat, subNode, routes, callback, opts);
              }
            )
          : callback &&
            callback.call(this, null, routes.slice(0, opts.levelLimit));
      },
      _buildAreaNode: function (adcode, distData) {
        if (!this._areaNodeCache[adcode]) {
          if (!distData) throw new Error("Empty distData: " + adcode);
          var areaNode = new AreaNode(
            adcode,
            distDataParser.buildData(distData),
            this._opts
          );
          this._areaNodeCache[adcode] = areaNode;
          this._areaNodesForLocating ||
            (this._areaNodesForLocating = [areaNode]);
        }
      },
      _renderMultiPolygon: function (coords, styleOptions, attchedData) {
        for (var polygons = [], i = 0, len = coords.length; i < len; i++)
          styleOptions &&
            polygons.push(
              this._renderPolygon(
                coords[i],
                styleOptions[i] || styleOptions,
                attchedData
              )
            );
        return polygons;
      },
      _renderPolygon: function (coords, styleOptions, attchedData) {
        if (!styleOptions) return null;
        var polygon = new AMap.Polygon(
          utils.extend(
            {
              bubble: !0,
              lineJoin: "round",
              map: this._opts.map,
            },
            styleOptions,
            {
              path: coords,
            }
          )
        );
        attchedData && (polygon._attched = attchedData);
        this._opts.keepFeaturePolygonReference &&
          this._renderedPolygons.push(polygon);
        return polygon;
      },
      getAdcodeOfFeaturePolygon: function (polygon) {
        return polygon._attched ? polygon._attched.adcode : null;
      },
      findFeaturePolygonsByAdcode: function (adcode) {
        var list = this._renderedPolygons,
          polys = [];
        adcode = parseInt(adcode, 10);
        for (var i = 0, len = list.length; i < len; i++)
          this.getAdcodeOfFeaturePolygon(list[i]) === adcode &&
            polys.push(list[i]);
        return polys;
      },
      getAllFeaturePolygons: function () {
        return this._renderedPolygons;
      },
      clearFeaturePolygons: function () {
        for (
          var list = this._renderedPolygons, i = 0, len = list.length;
          i < len;
          i++
        )
          list[i].setMap(null);
        list.length = 0;
      },
      removeFeaturePolygonsByAdcode: function (adcode) {
        this.removeFeaturePolygons(this.findFeaturePolygonsByAdcode(adcode));
      },
      removeFeaturePolygons: function (polygons) {
        for (
          var list = this._renderedPolygons, i = 0, len = list.length;
          i < len;
          i++
        )
          if (polygons.indexOf(list[i]) >= 0) {
            list[i].setMap(null);
            list.splice(i, 1);
            i--;
            len--;
          }
      },
      clearAreaNodeCacheByAdcode: function (adcode) {
        var nodeCache = this._areaNodeCache;
        if (this._undefAreaNodeJson(adcode)) {
          delete nodeCache[adcode];
          return !0;
        }
        console.warn("Failed undef: ", adcode);
        return !1;
      },
      clearAreaNodeCache: function (match) {
        if (match) return this.clearAreaNodeCacheByAdcode(match);
        var nodeCache = this._areaNodeCache;
        for (var adcode in nodeCache)
          nodeCache.hasOwnProperty(adcode) &&
            this.clearAreaNodeCacheByAdcode(adcode);
      },
      renderFeature: function (feature, styleOptions) {
        if (!styleOptions) return null;
        var geometry = feature.geometry;
        if (!geometry) return null;
        var coords = geometry.coordinates,
          attchedData = feature.properties,
          results = [];
        switch (geometry.type) {
          case "MultiPolygon":
            results = this._renderMultiPolygon(
              coords,
              styleOptions,
              attchedData
            );
            break;

          case "Polygon":
            results = [this._renderPolygon(coords, styleOptions, attchedData)];
            break;

          default:
            throw new Error("Unknow geometry: " + geometry.type);
        }
        return results;
      },
      renderSubFeatures: function (areaNode, subStyleOption) {
        for (
          var features = areaNode.getSubFeatures(),
            isSubStyleFunc = utils.isFunction(subStyleOption),
            results = [],
            i = 0,
            len = features.length;
          i < len;
          i++
        ) {
          var feature = features[i];
          results.push(
            this.renderFeature(
              feature,
              isSubStyleFunc
                ? subStyleOption.call(this, feature, i)
                : subStyleOption
            )
          );
        }
        return results;
      },
      renderParentFeature: function (areaNode, parentStyleOption) {
        return this.renderFeature(
          areaNode.getParentFeature(),
          parentStyleOption
        );
      },
    });
    return DistrictExplorer;
  }
)(()=> {}, {}, utils, Const, distDataParser, AreaNode)
