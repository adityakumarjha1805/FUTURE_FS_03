export function errorResponse(message, status = 400) {
    return Response.json({ error: message }, { status });
}

export async function readJson(request) {
    try {
        return { data: await request.json() };
    } catch {
        return { response: errorResponse("Request body must be valid JSON.") };
    }
}

export function cleanText(value, maxLength = 200) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function publicProduct(product) {
    const { _id, ...fields } = product;
    return { id: _id.toString(), ...fields };
}