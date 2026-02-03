const camps = require('../data/camps.json');
const images = require('../data/camp-images.json');

const imageMap = new Map(images.map(i => [i.id, i.image_url]));

// Camps missing images: no image_url in camps.json AND not in camp-images.json
const missing = camps.filter(c => {
  const hasInCamps = c.image_url && c.image_url.length > 5;
  const hasInImages = imageMap.has(c.id) && imageMap.get(c.id) && imageMap.get(c.id).length > 5;
  return !hasInCamps && !hasInImages;
});

console.log(`Total camps: ${camps.length}`);
console.log(`Camps with images in camp-images.json: ${images.filter(i => i.image_url).length}`);
console.log(`Camps missing images: ${missing.length}\n`);

missing.forEach(c => {
  console.log(`${c.id} | ${c.camp_name} | ${c.category} | ${c.website_url || 'no url'}`);
});
