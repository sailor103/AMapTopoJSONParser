const bbIdxBuilder = require('./bbIdxBuilder')
const BoundsItem = require('./BoundsItem')
const topojson = require('./topojson-client')

module.exports = (
  function (bbIdxBuilder, BoundsItem, topojson) {
    function parseTopo(topo) {
      var result = {},
        objects = topo.objects;
      for (var k in objects)
        objects.hasOwnProperty(k) &&
        (result[k] = topojson.feature(topo, objects[k]));
      return result;
    }
    function filterSub(geoData) {
      for (
        var features = geoData.sub ? geoData.sub.features : [],
          parentProps = geoData.parent.properties,
          subAcroutes = (parentProps.acroutes || []).concat([
            parentProps.adcode,
          ]),
          i = 0,
          len = features.length;
        i < len;
        i++
      ) {
        features[i].properties.subFeatureIndex = i;
        features[i].properties.acroutes = subAcroutes;
      }
    }
    function buildData(data) {
      if (!data._isBuiled) {
        bbIdxBuilder.buildIdxList(data.bbIndex);
        data.geoData = parseTopo(data.topo);
        data.geoData.sub && filterSub(data.geoData);
        var bbox = data.topo.bbox;
        data.bounds = new BoundsItem(
          bbox[0],
          bbox[1],
          bbox[2] - bbox[0],
          bbox[3] - bbox[1]
        );
        data.topo = null;
        data._isBuiled = !0;
      }
      return data;
    }
    return {
      buildData: buildData,
    };
  }
)(bbIdxBuilder, BoundsItem, topojson)
