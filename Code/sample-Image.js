exports.doc = 'sampleBalancedImage(image, geometry, pixel)' +
      '\n Function to random sampling with balanced classes'

exports.sampleBalancedImage = function(image1) {
  // default bands  
  var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7','B8', 'B9', 'B10', 'B11', 'B12', 'class'];
  // cloud band  
  var image = ee.Image(image1)
  var cloud = image.select('QA60')
  .unmask(0)
  .remap([0, 1024, 2048], [0, 1, 1])
  .rename('class')
  // add cloud band  
  var imageClass = image.addBands(cloud)
  // sample for noClouds  
  var imageSample0 = imageClass
      .select(bands)
      .updateMask(imageClass.select('class').eq(0))
      .sample({numPixels: 1000})
      .randomColumn('x')
      .sort('x')
      .limit(500)
      .select(bands)
  // sample for clouds     
  var imageSample1 = imageClass
      .select(bands)
      .updateMask(imageClass.select('class').eq(1))
      .sample({numPixels: 1000})
      .randomColumn('x')
      .sort('x')
      .limit(500)
      .select(bands)
  
  return imageSample0.merge(imageSample1)     
}  
  

