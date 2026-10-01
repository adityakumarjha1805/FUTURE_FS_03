import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/forever_store";
const products = [
  { slug: "men-round-neck-pure-cotton-t-shirt", name: "Men Round Neck Pure Cotton T-shirt", category: "Men", price: 199, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747199768/yn7n2yr38i6h3cee9xuf.png" },
  { slug: "girls-round-neck-cotton-top", name: "Girls Round Neck Cotton Top", category: "Women", price: 220, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747199830/kzgzkljyhcqphozpxrab.png" },
  { slug: "men-round-neck-cotton-t-shirt", name: "Men Round Neck Cotton T-shirt", category: "Men", price: 91, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747199882/ynloixbina6jcxbtsdxt.png" },
  { slug: "women-round-neck-cotton-top", name: "Women Round Neck Cotton Top", category: "Women", price: 130, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747199927/cenasiptodbntb0yvrxd.png" },
  { slug: "men-pure-cotton-t-shirt-classic", name: "Men Pure Cotton T-shirt", category: "Men", price: 140, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747200110/asxgjzthryb089qtyrg9.png" },
  { slug: "girls-round-neck-cotton-shirt", name: "Girls Round Neck Cotton Top", category: "Women", price: 140, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747199975/ywonw2fbz6ygzhrflvca.png" },
  { slug: "men-tapered-fit-trousers", name: "Men Tapered Fit Flat-Front Trousers", category: "Men", price: 189, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747200045/fhi5icviuwa0lyf0osd5.png" },
  { slug: "kids-round-neck-cotton-top", name: "Girl Round Neck Top", category: "Kids", price: 148, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747200187/sl0db1mummxywoplfjjo.png" },
];

const client = new MongoClient(uri);

try {
  await client.connect();
  const collection = client.db().collection("products");
  await collection.createIndex({ slug: 1 }, { unique: true });

  for (const product of products) {
    await collection.updateOne(
      { slug: product.slug },
      {
        $setOnInsert: {
          ...product,
          description: "Everyday comfort with a clean, easy-to-style fit.",
          stock: 20,
          active: true,
          createdAt: new Date(),
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  }

  console.log(`Seeded ${products.length} catalog products into ${client.db().databaseName}.`);
} catch (error) {
  console.error("Product seeding failed:", error);
  process.exitCode = 1;
} finally {
  await client.close();
}