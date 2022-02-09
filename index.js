const fs = require('fs');
const Const = require('./Const')
const geomUtils = require('./geomUtils')
const bbIdxBuilder = require('./bbIdxBuilder')

const utils = require('./utils')
const BoundsItem = require('./BoundsItem')
const topojson = require('./topojson-client')
const SphericalMercator = require('./SphericalMercator')
const distDataParser = require('./distDataParser')
const AreaNode = require('./AreaNode')


const _buildAreaNode = (adcode, distData) => {

  if (!distData) throw new Error("Empty distData");
  const areaNode = new AreaNode(
    adcode,
    distDataParser.buildData(distData),
    this._opts
  );

  console.log(areaNode)
  return areaNode;
};

const data = JSON.parse(
  fs.readFileSync('./data/an_370000.json')
);

const buildData = _buildAreaNode(370000, data)

const geoJSON = {
  type: "FeatureCollection",
  features: buildData.getSubFeatures()
}

fs.writeFileSync('./data/an_370000.geojson', JSON.stringify(geoJSON), 'utf8')
