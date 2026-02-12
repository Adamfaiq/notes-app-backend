# Notes App - Advanced Features Documentation

---

## 📋 TABLE OF CONTENTS

1. [Feature 1: Tags Management](#feature-1-tags-management)
2. [Feature 2: Pin/Unpin Notes](#feature-2-pinunpin-notes)
3. [Feature 3: Filter by Color & Combined Filters](#feature-3-filter-by-color--combined-filters)
4. [Complete API Reference](#complete-api-reference)
5. [Code Patterns Explained](#code-patterns-explained)

---

## 🏷️ FEATURE 1: TAGS MANAGEMENT

### **Concept**

Tags = labels untuk organize notes. Satu note boleh ada multiple tags.

**Example:**
```
Note: "Learn React"
Tags: ["coding", "react", "frontend", "javascript"]
```

---

### **Schema (Already in Note.js)**

```javascript
tags: {
  type: [String],  // Array of strings
}
```

**Maksud:**
- `[String]` = array yang contain strings
- Boleh kosong `[]` atau ada banyak `["tag1", "tag2", "tag3"]`

---

### **Routes Added**

#### **1. Create Note with Tags (Modified existing POST)**

**Endpoint:** `POST /api/notes`

**Request Body:**
```json
{
  "title": "Learn React",
  "content": "Start with components and hooks",
  "tags": ["coding", "react", "frontend"],
  "color": "blue"
}
```

**Code Flow:**

```javascript
router.post("/", async (req, res) => {
  try {
    // STEP 1: Extract data from request body
    const { title, content, tags, color, isPinned } = req.body;

    // STEP 2: Validation
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: "Title and Content required" 
      });
    }

    // STEP 3: Create note in database
    const note = await Note.create({
      userId: req.user._id,  // From protect middleware
      title,
      content,
      tags,        // Array will be saved as-is
      color,
      isPinned
    });

    // STEP 4: Respond with created note
    res.status(201).json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

**Line by Line:**

**Line 3:** `const { title, content, tags, color, isPinned } = req.body;`
- Destructure data dari request body
- `tags` = array of strings

**Line 5-9:** Validation
- Check title & content wajib ada
- Tags optional (boleh undefined/empty)

**Line 11-17:** Create note
- `Note.create()` = save to database
- `userId: req.user._id` = link to logged-in user
- `tags` = if undefined, MongoDB saves as empty array `[]`

**Line 19:** Return response
- Status 201 = Created
- Return full note object dengan `_id`, `createdAt`, etc

---

#### **2. Add Tag to Existing Note**

**Endpoint:** `PUT /api/notes/:id/tags/add`

**Request Body:**
```json
{
  "tag": "javascript"
}
```

**Response:**
```json
{
  "success": true,
  "note": {
    "_id": "...",
    "tags": ["coding", "react", "frontend", "javascript"]
  }
}
```

**Code Flow:**

```javascript
router.put("/:id/tags/add", async (req, res) => {
  try {
    // STEP 1: Extract tag from body
    const { tag } = req.body;

    // STEP 2: Validation
    if (!tag) {
      return res.status(400).json({ 
        success: false, 
        message: "Tag required" 
      });
    }

    // STEP 3: Find note (with ownership check)
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res.status(404).json({ 
        success: false, 
        message: "Note not found" 
      });
    }

    // STEP 4: Check if tag already exists
    if (note.tags.includes(tag)) {
      return res.status(400).json({ 
        success: false, 
        message: "Tag already exists" 
      });
    }

    // STEP 5: Add tag to array
    note.tags.push(tag);
    await note.save();

    // STEP 6: Return updated note
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

**Line by Line:**

**Line 3:** `const { tag } = req.body;`
- Extract single tag string dari body

**Line 6-10:** Validation
- Ensure tag provided

**Line 13-16:** Find note with security check
- `_id: req.params.id` = match by note ID from URL
- `userId: req.user._id` = AND belongs to logged-in user
- **Security:** Prevent user A from editing user B's note

**Line 18-22:** Check note exists
- If null, note takde atau bukan milik user

**Line 25-29:** Prevent duplicate tags
- `note.tags.includes(tag)` = check if tag already in array
- Example: `["react"].includes("react")` = true

**Line 32:** Add tag to array
- `note.tags.push(tag)` = append to end of array
- Before: `["coding", "react"]`
- After push("javascript"): `["coding", "react", "javascript"]`

**Line 33:** Save to database
- `await note.save()` = update document in MongoDB

---

#### **3. Remove Tag from Note**

**Endpoint:** `PUT /api/notes/:id/tags/remove`

**Request Body:**
```json
{
  "tag": "frontend"
}
```

**Code Flow:**

```javascript
router.put("/:id/tags/remove", async (req, res) => {
  try {
    const { tag } = req.body;

    if (!tag) {
      return res.status(400).json({ 
        success: false, 
        message: "Tag required" 
      });
    }

    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res.status(404).json({ 
        success: false, 
        message: "Note not found" 
      });
    }

    // Remove tag from array using filter
    note.tags = note.tags.filter(t => t !== tag);
    await note.save();

    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

**Key Line Explained:**

**Line 25:** `note.tags = note.tags.filter(t => t !== tag);`

**Breakdown:**
- `note.tags.filter()` = create new array with items that pass test
- `t => t !== tag` = keep items that NOT equal to tag we want remove
- Assign result back to `note.tags`

**Example:**
```javascript
// Before
note.tags = ["coding", "react", "frontend", "javascript"]
tag = "frontend"

// Process
note.tags.filter(t => t !== "frontend")
// Loop:
// "coding" !== "frontend" ? true → keep
// "react" !== "frontend" ? true → keep
// "frontend" !== "frontend" ? false → REMOVE
// "javascript" !== "frontend" ? true → keep

// After
note.tags = ["coding", "react", "javascript"]
```

---

#### **4. Get Notes by Tag**

**Endpoint:** `GET /api/notes/tag/:tagName`

**Example URL:** `/api/notes/tag/react`

**Response:**
```json
{
  "success": true,
  "tag": "react",
  "count": 2,
  "notes": [...]
}
```

**Code Flow:**

```javascript
router.get("/tag/:tagName", async (req, res) => {
  try {
    // STEP 1: Extract tag name from URL
    const { tagName } = req.params;

    // STEP 2: Find notes that have this tag
    const notes = await Note.find({
      userId: req.user._id,
      tags: { $in: [tagName] }
    }).sort({ createdAt: -1 });

    // STEP 3: Return results with count
    res.json({ 
      success: true, 
      tag: tagName,
      count: notes.length,
      notes 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

**Key Line Explained:**

**Line 9:** `tags: { $in: [tagName] }`

**MongoDB $in operator:**
- Check if array field contains any value dari list
- `$in: ["react"]` = cari documents yang tags array ada "react"

**Example:**
```javascript
// URL: /api/notes/tag/react

// Database search:
Note.find({
  userId: "user123",
  tags: { $in: ["react"] }
})

// Matches these notes:
// Note 1: tags = ["react", "coding"] ✅ (has "react")
// Note 2: tags = ["javascript", "react", "frontend"] ✅ (has "react")
// Note 3: tags = ["python", "backend"] ❌ (no "react")
```

---

### **Tags Feature Summary**

**What user can do:**
- ✅ Create note with multiple tags
- ✅ Add tag to existing note
- ✅ Remove specific tag
- ✅ Find all notes with specific tag
- ✅ Prevent duplicate tags

**Array methods used:**
- `.push()` - add to array
- `.filter()` - remove from array
- `.includes()` - check if exists

**MongoDB operators:**
- `$in` - match any value in array

---

## 📌 FEATURE 2: PIN/UNPIN NOTES

### **Concept**

Pinned notes = important notes yang muncul atas sekali.

**Use case:**
- Pin reminder penting
- Pin current task
- Pin frequently accessed notes

---

### **Schema (Already in Note.js)**

```javascript
isPinned: {
  type: Boolean,
  default: false
}
```

**Maksud:**
- Boolean = true atau false
- Default false = by default notes unpinned

---

### **Routes Added/Modified**

#### **1. Toggle Pin Status**

**Endpoint:** `PUT /api/notes/:id/pin`

**No body needed!** Just call endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Note pinned",  // or "Note unpinned"
  "note": {
    "isPinned": true
  }
}
```

**Code Flow:**

```javascript
router.put("/:id/pin", async (req, res) => {
  try {
    // STEP 1: Find note
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res.status(404).json({ 
        success: false, 
        message: "Note not found" 
      });
    }

    // STEP 2: Toggle isPinned
    note.isPinned = !note.isPinned;
    await note.save();

    // STEP 3: Return with dynamic message
    res.json({ 
      success: true, 
      message: note.isPinned ? "Note pinned" : "Note unpinned",
      note 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

**Key Lines Explained:**

**Line 16:** `note.isPinned = !note.isPinned;`

**Toggle logic:**
- `!` = NOT operator (flip boolean)
- If `isPinned` is `true`, `!true` = `false`
- If `isPinned` is `false`, `!false` = `true`

**Example:**
```javascript
// First call (pin)
note.isPinned = false  // current value
note.isPinned = !false // flip
note.isPinned = true   // new value

// Second call (unpin)
note.isPinned = true   // current value
note.isPinned = !true  // flip
note.isPinned = false  // new value
```

**Line 21:** `message: note.isPinned ? "Note pinned" : "Note unpinned"`

**Ternary operator:**
- Format: `condition ? valueIfTrue : valueIfFalse`
- Check current state AFTER toggle
- Return appropriate message

**Example:**
```javascript
// After toggle, if isPinned is true:
note.isPinned ? "Note pinned" : "Note unpinned"
true ? "Note pinned" : "Note unpinned"
// Result: "Note pinned"

// After toggle, if isPinned is false:
note.isPinned ? "Note pinned" : "Note unpinned"
false ? "Note pinned" : "Note unpinned"
// Result: "Note unpinned"
```

---

#### **2. Modified GET All Notes (Sort Pinned First)**

**Endpoint:** `GET /api/notes`

**Before (old code):**
```javascript
const notes = await Note.find({ userId: req.user._id })
  .sort({ createdAt: -1 });
```

**After (new code):**
```javascript
const notes = await Note.find({ userId: req.user._id })
  .sort({ 
    isPinned: -1,    // Sort by isPinned first
    createdAt: -1    // Then sort by createdAt
  });
```

**Sort Logic Explained:**

**Multiple sort criteria:**
- MongoDB sorts by first criteria, then second

**`isPinned: -1` (descending):**
- `-1` = descending order
- Boolean sorting: `true` before `false`
- Result: Pinned notes (true) appear first

**`createdAt: -1` (descending):**
- Among same isPinned value, sort by newest first

**Example:**

```javascript
// Database has:
Note 1: isPinned = false, createdAt = "2026-02-08T10:00"
Note 2: isPinned = true,  createdAt = "2026-02-08T09:00"
Note 3: isPinned = false, createdAt = "2026-02-08T11:00"
Note 4: isPinned = true,  createdAt = "2026-02-08T08:00"

// After sort({ isPinned: -1, createdAt: -1 }):
// Step 1: Group by isPinned (true first)
// Pinned group (true):
//   - Note 2 (09:00)
//   - Note 4 (08:00)
// Unpinned group (false):
//   - Note 1 (10:00)
//   - Note 3 (11:00)

// Step 2: Within each group, sort by createdAt (newest first)
// Final order:
Note 2: isPinned = true,  createdAt = "09:00" (pinned, newer)
Note 4: isPinned = true,  createdAt = "08:00" (pinned, older)
Note 3: isPinned = false, createdAt = "11:00" (unpinned, newer)
Note 1: isPinned = false, createdAt = "10:00" (unpinned, older)
```

---

### **Pin Feature Summary**

**What user can do:**
- ✅ Toggle pin/unpin dengan single endpoint
- ✅ Pinned notes always appear first
- ✅ Within pinned/unpinned groups, newest first

**Concepts learned:**
- Boolean toggle (`!variable`)
- Ternary operator (`condition ? true : false`)
- Multiple sort criteria
- Dynamic messages based on state

---

## 🎨 FEATURE 3: FILTER BY COLOR & COMBINED FILTERS

### **Concept**

Filter notes by:
- Color only
- Pinned status only
- Both color AND pinned status

**Use cases:**
- Show all blue notes
- Show all pinned notes
- Show pinned blue notes

---

### **Route Added**

**Endpoint:** `GET /api/notes/filter`

**Query Parameters:**
- `color` (optional) - yellow/blue/green/pink
- `pinned` (optional) - true/false

**Examples:**
```
/api/notes/filter?color=blue
/api/notes/filter?pinned=true
/api/notes/filter?color=blue&pinned=true
/api/notes/filter (returns all)
```

**Response:**
```json
{
  "success": true,
  "filters": {
    "color": "blue",
    "pinned": "true"
  },
  "count": 1,
  "notes": [...]
}
```

---

### **Code Flow**

```javascript
router.get("/filter", async (req, res) => {
  try {
    // STEP 1: Extract query parameters
    const { color, pinned } = req.query;

    // STEP 2: Build filter object dynamically
    const filter = { userId: req.user._id };

    if (color) {
      filter.color = color;
    }

    if (pinned !== undefined) {
      filter.isPinned = pinned === 'true';
    }

    // STEP 3: Query database with built filter
    const notes = await Note.find(filter).sort({
      isPinned: -1,
      createdAt: -1
    });

    // STEP 4: Return results
    res.json({
      success: true,
      filters: { color, pinned },
      count: notes.length,
      notes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

---

### **Line by Line Explanation**

**Line 4:** `const { color, pinned } = req.query;`

**req.query explained:**
- Data dari URL after `?`
- Format: `?key1=value1&key2=value2`

**Example:**
```javascript
// URL: /api/notes/filter?color=blue&pinned=true

req.query = {
  color: "blue",
  pinned: "true"  // Note: string, bukan boolean!
}

// After destructuring:
color = "blue"
pinned = "true"
```

---

**Line 7:** `const filter = { userId: req.user._id };`

**Dynamic filter object:**
- Start with base filter (userId)
- Add conditions based on query params

---

**Line 9-11:** Add color filter (if provided)

```javascript
if (color) {
  filter.color = color;
}
```

**Logic:**
- If `color` exists in query params, add to filter
- If `color` is undefined/empty, skip

**Example:**
```javascript
// URL: /api/notes/filter?color=blue

// Before if:
filter = { userId: "user123" }

// After if (color exists):
filter = { 
  userId: "user123",
  color: "blue"
}
```

---

**Line 13-15:** Add pinned filter (if provided)

```javascript
if (pinned !== undefined) {
  filter.isPinned = pinned === 'true';
}
```

**Why `pinned !== undefined` instead of `if (pinned)`?**

Because:
- Query params always strings
- `pinned` could be `"true"` or `"false"` (both truthy!)
- Need to check if parameter exists at all

**String to Boolean conversion:**
```javascript
pinned === 'true'

// If pinned = "true":
"true" === "true" → true (boolean)

// If pinned = "false":
"false" === "true" → false (boolean)
```

**Example:**
```javascript
// URL: /api/notes/filter?pinned=true

pinned = "true" (string)

// Check exists:
pinned !== undefined → true, so enter if block

// Convert to boolean:
filter.isPinned = "true" === "true"
filter.isPinned = true (boolean)

// Final filter:
filter = {
  userId: "user123",
  isPinned: true
}
```

---

**Line 18-21:** Query database

```javascript
const notes = await Note.find(filter).sort({
  isPinned: -1,
  createdAt: -1
});
```

**Filter applied:**
- `Note.find(filter)` uses the dynamically built filter object

**Examples of different filter objects:**

**Example 1: Color only**
```javascript
// URL: /api/notes/filter?color=blue
filter = { 
  userId: "user123",
  color: "blue" 
}
// Finds: All blue notes for this user
```

**Example 2: Pinned only**
```javascript
// URL: /api/notes/filter?pinned=true
filter = { 
  userId: "user123",
  isPinned: true 
}
// Finds: All pinned notes for this user
```

**Example 3: Both**
```javascript
// URL: /api/notes/filter?color=blue&pinned=true
filter = { 
  userId: "user123",
  color: "blue",
  isPinned: true 
}
// Finds: Blue notes that are also pinned
```

**Example 4: Neither**
```javascript
// URL: /api/notes/filter
filter = { 
  userId: "user123" 
}
// Finds: All notes for this user
```

---

### **Filter Feature Summary**

**What user can do:**
- ✅ Filter by color
- ✅ Filter by pinned status
- ✅ Combine multiple filters
- ✅ Get all notes (no filters)

**Concepts learned:**
- Query parameters (`req.query`)
- Dynamic object building
- Conditional property addition
- String to boolean conversion
- `undefined` checking

---

## 📚 COMPLETE API REFERENCE

### **Authentication Routes**

| Method | Endpoint | Description | Body | Response |
|--------|----------|-------------|------|----------|
| POST | /api/auth/register | Register user | `{ username, email, password }` | User + token |
| POST | /api/auth/login | Login user | `{ email, password }` | User + token |

---

### **Notes Routes (All Protected)**

**Basic CRUD:**

| Method | Endpoint | Description | Body | Response |
|--------|----------|-------------|------|----------|
| POST | /api/notes | Create note | `{ title, content, tags?, color?, isPinned? }` | Created note |
| GET | /api/notes | Get all notes (sorted) | - | Array of notes |
| GET | /api/notes/:id | Get single note | - | Single note |
| PUT | /api/notes/:id | Update note | `{ title?, content? }` | Updated note |
| DELETE | /api/notes/:id | Delete note | - | Success message |

---

**Search & Filter:**

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|--------------|----------|
| GET | /api/notes/search | Search in title/content/tags | `?keyword=react` | Matching notes + count |
| GET | /api/notes/filter | Filter by color/pinned | `?color=blue&pinned=true` | Filtered notes + count |
| GET | /api/notes/tag/:tagName | Get notes by tag | - | Notes with tag + count |

---

**Tags Management:**

| Method | Endpoint | Description | Body | Response |
|--------|----------|-------------|------|----------|
| PUT | /api/notes/:id/tags/add | Add tag to note | `{ tag: "react" }` | Updated note |
| PUT | /api/notes/:id/tags/remove | Remove tag from note | `{ tag: "react" }` | Updated note |

---

**Pin Management:**

| Method | Endpoint | Description | Body | Response |
|--------|----------|-------------|------|----------|
| PUT | /api/notes/:id/pin | Toggle pin status | - | Updated note + message |

---

## 🎯 CODE PATTERNS EXPLAINED

### **Pattern 1: Dynamic Object Building**

**Use case:** Add properties conditionally

```javascript
const filter = { userId: req.user._id };

if (color) {
  filter.color = color;
}

if (pinned !== undefined) {
  filter.isPinned = pinned === 'true';
}
```

**Why useful:**
- Flexible queries
- Clean code (no if-else chains)
- Easy to extend

---

### **Pattern 2: Array Manipulation**

**Add to array:**
```javascript
note.tags.push("newTag");
```

**Remove from array:**
```javascript
note.tags = note.tags.filter(t => t !== tagToRemove);
```

**Check if exists:**
```javascript
if (note.tags.includes(tag)) {
  // Tag already exists
}
```

---

### **Pattern 3: Boolean Toggle**

```javascript
note.isPinned = !note.isPinned;
```

**Truth table:**
```
Before → After
true   → false
false  → true
```

---

### **Pattern 4: Ternary Operator**

```javascript
const message = condition ? "If true" : "If false";
```

**Example:**
```javascript
const status = isPinned ? "Pinned" : "Unpinned";
```

---

### **Pattern 5: Multiple Sort Criteria**

```javascript
.sort({ 
  field1: -1,  // Primary sort
  field2: -1   // Secondary sort (within same field1 value)
})
```

**Example:**
```javascript
.sort({ 
  isPinned: -1,   // Pinned first
  createdAt: -1   // Newest first within each group
})
```

---

### **Pattern 6: Query Parameters vs URL Parameters**

**URL Parameters (req.params):**
```javascript
// Route: /api/notes/:id
// URL: /api/notes/abc123
req.params.id = "abc123"
```

**Query Parameters (req.query):**
```javascript
// Route: /api/notes/filter
// URL: /api/notes/filter?color=blue&pinned=true
req.query.color = "blue"
req.query.pinned = "true"
```

---

### **Pattern 7: Security Check Before Update/Delete**

```javascript
const note = await Note.findOne({ 
  _id: req.params.id,       // Match by ID
  userId: req.user._id     // AND belongs to user
});

if (!note) {
  return res.status(404).json({ message: 'Not found' });
}
```

**Why important:**
- Prevent unauthorized access
- User A can't modify User B's data

---

## 🔄 FEATURE FLOW DIAGRAMS

### **Tags Flow**

```
CREATE NOTE WITH TAGS:
User → POST /api/notes { tags: ["react", "coding"] }
  → Server validates title & content
  → Server creates note in DB with tags array
  → Server returns note with tags

ADD TAG:
User → PUT /api/notes/:id/tags/add { tag: "javascript" }
  → Server finds note (ownership check)
  → Server checks if tag already exists
  → If new: server pushes tag to array
  → Server saves note
  → Server returns updated note

REMOVE TAG:
User → PUT /api/notes/:id/tags/remove { tag: "react" }
  → Server finds note (ownership check)
  → Server filters out specified tag
  → Server saves note
  → Server returns updated note

GET BY TAG:
User → GET /api/notes/tag/react
  → Server queries notes where tags array contains "react"
  → Server returns matching notes with count
```

---

### **Pin Flow**

```
TOGGLE PIN:
User → PUT /api/notes/:id/pin
  → Server finds note (ownership check)
  → Server flips isPinned (true ↔ false)
  → Server saves note
  → Server returns note with dynamic message

GET ALL (SORTED):
User → GET /api/notes
  → Server queries all user's notes
  → Server sorts: isPinned desc, then createdAt desc
  → Result: Pinned notes first, newest first within each group
  → Server returns sorted array
```

---

### **Filter Flow**

```
FILTER REQUEST:
User → GET /api/notes/filter?color=blue&pinned=true
  → Server extracts query params
  → Server builds filter object:
      { userId: "user123", color: "blue", isPinned: true }
  → Server queries DB with filter
  → Server sorts results
  → Server returns filtered notes with count
```

---

## ✅ TESTING CHECKLIST

**Tags:**
- [ ] Create note with tags
- [ ] Create note without tags (empty array)
- [ ] Add tag to note
- [ ] Try adding duplicate tag (should reject)
- [ ] Remove tag from note
- [ ] Get notes by tag
- [ ] Get notes by non-existent tag (empty result)

**Pin:**
- [ ] Pin a note (isPinned → true)
- [ ] Unpin a note (isPinned → false)
- [ ] Get all notes (pinned appear first)
- [ ] Create pinned note directly

**Filter:**
- [ ] Filter by color only
- [ ] Filter by pinned only
- [ ] Filter by color + pinned (combined)
- [ ] Filter with no params (all notes)
- [ ] Filter with invalid color (empty result)

---

## 🎓 KEY TAKEAWAYS

**Array Operations:**
- `.push(item)` - Add to end
- `.filter(condition)` - Remove items
- `.includes(item)` - Check exists
- `$in` operator - MongoDB array search

**Boolean Operations:**
- `!variable` - Toggle/flip
- Ternary: `condition ? true : false`

**Dynamic Queries:**
- Build filter objects conditionally
- Query parameters for flexible filtering
- String to boolean conversion

**Sorting:**
- Multiple criteria
- Descending (`-1`) vs Ascending (`1`)

**Security:**
- Always check ownership
- Validate user input
- Prevent unauthorized access

---

**END OF ADVANCED FEATURES DOCUMENTATION**

Use this as reference when building similar features in other projects! 🚀
