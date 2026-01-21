# API Documentation

Base URL: `http://localhost:3000/api/v1`

All endpoints accept and return JSON.

## Error Format

Validation errors return HTTP 400 with this shape:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "in": "body | params | query",
      "errors": [{ "path": "field.path", "message": "Reason" }]
    }
  ]
}
```

Other errors use:

```json
{
  "status": "fail | error",
  "message": "Reason"
}
```

## Tours

### GET `/tours`

List all tours. Supports filtering, sorting, field selection, and pagination.

Query parameters:

- `page` (number, optional, default `1`) - page number for pagination.
- `limit` (number, optional, default `10`) - page size for pagination.
- `sort` (string, optional) - comma-separated `field:direction` pairs. Allowed fields: `price`, `ratingsAverage`, `duration`. Direction must be `asc` or `desc` (case-insensitive).
  - Example: `sort=ratingsAverage:desc,price:asc`
  - If omitted, default sort is `price:asc,ratingsAverage:desc`.
  - The `sort` parameter must be provided once and cannot contain duplicate fields.
- `fields` (string, optional) - comma-separated projection list. Supports include (`name,duration`) or exclude (`-price,-priceDiscount`) but cannot mix include and exclude values. `_id` is always included and `__v` is always excluded; neither is allowed in `fields`.
- `difficulty` (string, optional) - `easy | medium | difficult`.
- `duration` (number or range object, optional):
  - Exact: `duration=5`
  - Range: `duration[gte]=5&duration[lte]=10` (supports `gte`, `gt`, `lte`, `lt`)
- `price` (number or range object, optional):
  - Exact: `price=500`
  - Range: `price[gte]=100&price[lt]=800`

Response: `200`

```json
{
  "status": "success",
  "results": 2,
  "page": 1,
  "data": {
    "tours": []
  }
}
```

### POST `/tours`

Create a tour.

Body (required fields noted):

- `name` (string, required)
- `duration` (number, required)
- `maxGroupSize` (number, required)
- `difficulty` (string, required, `easy | medium | difficult`)
- `price` (number, required)
- `summary` (string, required)
- `imageCover` (string, required)
- `ratingsAverage` (number, optional, default `4.5`)
- `ratingsQuantity` (number, optional, default `0`)
- `priceDiscount` (number, optional, default `0`)
- `description` (string, optional)
- `images` (string[], optional, default `[]`)
- `createdAt` (date string or number, optional)
- `startDates` (array of date strings or numbers, optional, default `[]`)

Business rule:

- `priceDiscount` cannot be greater than `price`.

Response: `201`

```json
{
  "status": "success",
  "data": {
    "tour": {}
  }
}
```

### GET `/tours/:id`

Get a tour by id.

Params:

- `id` (Mongo ObjectId)

Response: `200`

```json
{
  "status": "success",
  "data": {
    "tour": {}
  }
}
```

### PATCH `/tours/:id`

Update a tour by id. Only the fields below are allowed.

Body (all optional):

- `name` (string)
- `duration` (number)
- `maxGroupSize` (number)
- `difficulty` (string, `easy | medium | difficult`)
- `price` (number)
- `priceDiscount` (number)
- `summary` (string)
- `description` (string)
- `imageCover` (string)
- `images` (string[])
- `startDates` (array of date strings)

Business rule:

- `priceDiscount` cannot be greater than `price` after the patch is applied.

Response: `200`

```json
{
  "status": "success",
  "tour": {}
}
```

If the tour does not exist, the response is `400` with:

```json
{
  "status": "fail",
  "message": "Tour not found"
}
```

### DELETE `/tours/:id`

Delete a tour by id.

Response: `204`

```json
{
  "status": "success",
  "data": null
}
```

## Users

The user routes exist but are not implemented yet. All return HTTP `500` with:

```json
{
  "status": "error",
  "message": "This route hasn't implemented yet."
}
```

Endpoints:

- GET `/users`
- POST `/users`
- GET `/users/:id`
- PATCH `/users/:id`
- DELETE `/users/:id`
