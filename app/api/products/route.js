import { getDb } from "../../../lib/mongodb.js";
import { getSessionUser } from "../../../lib/auth.js";
import { cleanText, errorResponse, publicProduct, readJson } from "../../../lib/api.js";

export const runtime = "nodejs";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
        const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") || "24", 10) || 24));
        const search = cleanText(searchParams.get("q"), 80);
        const category = cleanText(searchParams.get("category"), 80);
        const filter = { active: { $ne: false } };

        if (category) filter.category = category;
        if (search) filter.$or = [
            { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { description: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        ];

        const db = await getDb();
        const products = await db.collection("products")
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        return Response.json({ products: products.map(publicProduct), page, limit });
    } catch (error) {
        console.error("Product listing failed:", error);
        return errorResponse("Unable to load products.", 500);
    }
}

export async function POST(request) {
    const user = await getSessionUser();
    if (!user) return errorResponse("Authentication required.", 401);
    if (user.role !== "admin") return errorResponse("Admin access required.", 403);

    const parsed = await readJson(request);
    if (parsed.response) return parsed.response;
    const name = cleanText(parsed.data.name, 120);
    const slug = cleanText(parsed.data.slug, 140).toLowerCase();
    const image = cleanText(parsed.data.image, 1000);
    const category = cleanText(parsed.data.category, 80);
    const price = Number(parsed.data.price);
    const stock = Number(parsed.data.stock);

    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !image || !category ||
        !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
        return errorResponse("Provide a name, slug, image, category, non-negative price, and whole-number stock.");
    }

    try {
        const product = {
            name,
            slug,
            image,
            category,
            description: cleanText(parsed.data.description, 1000),
            price,
            stock,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await (await getDb()).collection("products").insertOne(product);
        return Response.json({ product: publicProduct({ ...product, _id: result.insertedId }) }, { status: 201 });
    } catch (error) {
        if (error.code === 11000) return errorResponse("A product with this slug already exists.", 409);
        console.error("Product creation failed:", error);
        return errorResponse("Unable to create product.", 500);
    }
}