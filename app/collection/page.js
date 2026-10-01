import Image from "next/image";
import AddToCartButton from "../components/AddToCartButton.js";

const products = [
  { id: "men-round-neck-pure-cotton-t-shirt", name: "Men Round Neck Pure Cotton T-shirt", category: "Men", price: 199, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747199768/yn7n2yr38i6h3cee9xuf.png" },
  { id: "girls-round-neck-cotton-top", name: "Girls Round Neck Cotton Top", category: "Women", price: 220, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747199830/kzgzkljyhcqphozpxrab.png" },
  { id: "men-round-neck-cotton-t-shirt", name: "Men Round Neck Cotton T-shirt", category: "Men", price: 91, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747199882/ynloixbina6jcxbtsdxt.png" },
  { id: "women-round-neck-cotton-top", name: "Women Round Neck Cotton Top", category: "Women", price: 130, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747199927/cenasiptodbntb0yvrxd.png" },
  { id: "men-pure-cotton-t-shirt-classic", name: "Men Round Neck Pure Cotton T-shirt", category: "Men", price: 140, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747200110/asxgjzthryb089qtyrg9.png" },
  { id: "girls-round-neck-cotton-shirt", name: "Girl Round Neck Cotton Top", category: "Women", price: 140, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747199975/ywonw2fbz6ygzhrflvca.png" },
  { id: "men-tapered-fit-trousers", name: "Men tapered Fit Flat-Front Trousers", category: "Men", price: 189, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747200045/fhi5icviuwa0lyf0osd5.png" },
  { id: "kids-round-neck-cotton-top", name: "Girl Round Neck Top", category: "Kids", price: 148, image: "https://res.cloudinary.com/dnmqrsc4s/image/upload/v1747200187/sl0db1mummxywoplfjjo.png" },
];

function ProductRow({ items, className }) {
  return (
    <div className={className}>
      {items.map((product) => (
        <article className="collection-product" key={product.id}>
          <Image
            alt={product.name}
            className="collection-image"
            height={450}
            loading={product.id === products[0].id ? "eager" : "lazy"}
            src={product.image}
            unoptimized
            width={300}
          />
          <div className="collection-description">
            <p>{product.name}</p>
            <p>${product.price}</p>
            <AddToCartButton product={product} />
          </div>
        </article>
      ))}
    </div>
  );
}

export default function CollectionPage() {
  return (
    <main className="collection-hero">
      <h1 className="collection-heading">ALL COLLECTION─────</h1>
      <ProductRow className="collection-one" items={products.slice(0, 4)} />
      <ProductRow className="collection-two" items={products.slice(4)} />
    </main>
  );
}
<div className="cart-in5"><button className="cart-button">Add to Cart</button></div>
