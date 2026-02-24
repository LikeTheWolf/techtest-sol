# Coding Test: File Upload API + Asynchronous Email Validation (Express + TypeScript)

## Overview

Build an Express.js API that accepts a CSV file of user data and performs **asynchronous** email validation for each record.

This test is intended to evaluate:
- Correct use of `async/await`
- Concurrency control
- Error handling
- Clear result reporting

**Submission:** Share a link to your repository (and deployed URL, if applicable).

---

## Core Requirements

### 1. Implement `POST /upload` to accept a CSV file

Create an endpoint at `POST /upload` that accepts a `.csv` file with this format:

```csv
name,email
John Doe,john@example.com
Jane Smith,invalid-email
```

### 2. Parse and validate each email asynchronously

For each CSV row, validate the email by simulating an external service call (for example, with `setTimeout`, `axios`, etc.).

Example mock validator:

```ts
const mockValidateEmail = async (email: string) => {
  return new Promise<{ valid: boolean }>((resolve) => {
    setTimeout(() => {
      if (email.includes("@")) {
        resolve({ valid: true });
      } else {
        resolve({ valid: false });
      }
    }, 100);
  });
};
```

### 3. Collect results

For each record:
- If valid, count it as processed successfully
- If invalid, include it in a failed-records list

### 4. Return a summary JSON response

Example response:

```json
{
  "totalRecords": 10,
  "processedRecords": 9,
  "failedRecords": 1,
  "details": [
    {
      "name": "Jane Smith",
      "email": "invalid-email",
      "error": "Invalid email format"
    }
  ]
}
```

---

## Advanced Requirements

### 1. Concurrency handling

Limit concurrent email validations to **5** at a time (custom queue or a library like `p-limit`).

### 2. Error handling

Handle validation service failures such as:
- Timeout
- Unexpected errors

If a server-side issue occurs, respond gracefully with:
- HTTP `500`
- Descriptive error message

### 3. Optional status endpoint

Add:
- `GET /status/:uploadId` to track upload processing progress

Store progress in memory or a temporary store (for example, `Map` or Redis).

### 4. Rate limiting

Rate-limit `POST /upload` (for example, `10` requests per minute per IP) using `express-rate-limit`.

### 5. Unit tests

Add unit tests for:
- File parsing
- Async email validation logic
- Error handling

Use Jest or Mocha.

### 6. Logging

Log each validation attempt and outcome (for example, with Winston and appropriate log levels).

### 7. Optimization

Use streams when parsing large files to reduce memory usage.

---

## Example API Design

### `POST /upload`

Request: CSV file upload

Initial response example:

```json
{
  "uploadId": "abc123",
  "message": "File uploaded successfully. Processing started."
}
```

Post-processing response example:

```json
{
  "totalRecords": 10,
  "processedRecords": 9,
  "failedRecords": 1,
  "details": [
    {
      "name": "Jane Smith",
      "email": "invalid-email",
      "error": "Invalid email format"
    }
  ]
}
```

### `GET /status/:uploadId`

Response example:

```json
{
  "uploadId": "abc123",
  "progress": "70%"
}
```

---

## Suggested Implementation Notes

### File upload and parsing

- Use `multer` for file upload handling
- Parse CSV with `csv-parser` or `fast-csv`

### Async validation

- Create a mock service (`mockValidateEmail`) using `setTimeout`
- Use `async/await` for record processing

### Concurrency limiting example

```ts
const pLimit = require("p-limit");
const limit = pLimit(5);

const results = await Promise.all(
  emails.map((email: string) => limit(() => mockValidateEmail(email)))
);
```

### Status tracking

- Store progress by `uploadId` in memory (for example, `Map`) or Redis

### Rate limiting example

```ts
const rateLimit = require("express-rate-limit");

const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10 // limit each IP to 10 requests per minute
});
```

### Unit testing scope

- File upload and parsing
- Async validation success/failure
- Edge-case error handling