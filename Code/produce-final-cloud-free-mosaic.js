
///////////////////////////////////////////////////////////
// define helper functions
///////////////////////////////////////////////////////////

// function for classify all images in a collection 
// adds classification band and smooth neighborhood

var classifyCloud = function(image) {
  var classification = ee.Image(image).classify(classifier)
//  var classificationSmooth = classification.reduceNeighborhood({
//  reducer: ee.Reducer.max(),
//  kernel: ee.Kernel.circle(2),
//})
  return image.addBands(classification.rename('classification'))
};

// function to add NVI 
var addNdvi = function(image) {
    var ndvi = image.normalizedDifference(['B8', 'B4']).rename('ndvi')
      return image
          .addBands(ndvi)
}; 

// function to mask clouds with the classification band
var cloudMask = function(image) {
  // function to change ID
      return ee.Image(image).updateMask(image.select(['classification']).eq(0))
};

var waterMasc = function(mosaic, collection, B12Threshold) {
    var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7','B8', 'B9', 'B10', 'B11', 'B12'];
    var mosaicSubBands = mosaic.select(bands)
    var collectionSubBands = collection.select(bands)
    var percentile = collectionSubBands.reduce(ee.Reducer.percentile([20]))
      .select(['B2_p20','B3_p20','B4_p20','B5_p20','B6_p20','B7_p20','B8_p20','B9_p20','B10_p20','B11_p20','B12_p20'],
      bands)
      return mosaicSubBands
          .where(percentile.select('B12').lt(ee.Number(B12Threshold)), percentile)
};


///////////////////////////////////////////////////////////
//load data
///////////////////////////////////////////////////////////

// boundary of zimbabwe
var zimbabwe  = ee.FeatureCollection("USDOS/LSIB/2013")
  .filter(ee.Filter.stringContains('name', 'ZIMBABWE'))
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7','B8', 'B9', 'B10', 'B11', 'B12'];

// load sentinel full data for zimbabwe
var trainingData = ee.ImageCollection('COPERNICUS/S2')
 .filterDate('2016-01-01', '2016-12-01')
 .filterBounds(zimbabwe)
// .filter(ee.Filter.gt('CLOUDY_PIXEL_PERCENTAGE', 5))
 .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 25))
 .limit(30)

// Band without class for classification
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7','B8', 'B9', 'B10', 'B11', 'B12'];

var classificationData = ee.ImageCollection('COPERNICUS/S2')
 .filterDate('2016-01-01', '2016-12-30')
 .filterBounds(zimbabwe)
 .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
//print(classificationData.size(), 'number of images')


///////////////////////////////////////////////////////////
// straitified random sampling from image collection
///////////////////////////////////////////////////////////
// load function to stratified random sampling
var ss = require('users/JesJehle/CloudFreeMosaic:Modules/sampleBalancedImage')
// sample from training data and creat sampled data
var training = trainingData
          .map(ss.sampleBalancedImage).flatten()

///////////////////////////////////////////////////////////
// Train models 
///////////////////////////////////////////////////////////
//CART classifier with default parameters.
var classifier = ee.Classifier.cart().train(training, 'class', bands);

///////////////////////////////////////////////////////////
// generate the final mosaic
///////////////////////////////////////////////////////////

var cloudMaskedMosaic = classificationData
    .map(addNdvi)
    .map(classifyCloud)
    .map(cloudMask)
    .qualityMosaic('ndvi')
    
///////////////////////////////////////////////////////////
// generate percentile mosaic
///////////////////////////////////////////////////////////

var percentileMosaic = classificationData.reduce(ee.Reducer.percentile([40]))

//print(cloudMaskedMosaic)   
// water mask
var cloudMaskedMosaicWater = waterMasc(cloudMaskedMosaic, classificationData, 300).clip(zimbabwe)
var percentileMosaic = classificationData.reduce(ee.Reducer.percentile([40])).clip(zimbabwe)


///////////////////////////////////////////////////////////
// visualisations 
///////////////////////////////////////////////////////////

Map.addLayer(cloudMaskedMosaicWater, {bands: ['B4', 'B3', 'B2'], min:0, max:3200}, 'mosaic with cloud masking');
Map.addLayer(percentileMosaic, {bands: ['B4_p40', 'B3_p40', 'B2_p40'], min:0, max:3200}, 'Percentile mosaic');



