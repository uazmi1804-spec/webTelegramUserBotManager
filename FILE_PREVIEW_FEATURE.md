# File Preview Feature

## Overview

Added "View" button in the Run Confirmation Modal to preview file contents before running the project. Users can now see exactly what will be sent to channels.

## Features

### 1. **View Button**
Each file in the messages list now has a "👁️ View" button that opens a preview modal.

### 2. **Text File Preview**
- Shows full text content
- Monospace font for readability
- Scrollable if content is long (max 400px height)
- Preserves formatting (whitespace, line breaks)

### 3. **Image Preview**
- Displays image inline
- Responsive sizing (max 500px)
- High quality preview
- Rounded corners for aesthetics

### 4. **Video Preview**
- Embedded video player with controls
- Play/pause, volume, fullscreen
- Responsive sizing
- Supports MP4 format

### 5. **Download Option**
- Every preview modal has a "📥 Download" button
- Opens file in new tab for download
- Works for all file types

## User Interface

### Run Confirmation Modal - Messages Section

```
📝 Messages (2)
┌────────────────────────────────────────────┐
│ 📄 test.txt                    [👁️ View]  │
│    Type: text | Size: 1.5 KB              │
├────────────────────────────────────────────┤
│ 🖼️ image.jpg                   [👁️ View]  │
│    Type: photo | Size: 245.3 KB           │
└────────────────────────────────────────────┘
```

### Preview Modal - Text File

```
┌──────────────────────────────────────┐
│ 👁️ Preview: test.txt            [X] │
├──────────────────────────────────────┤
│ Type: text | Size: 1.5 KB           │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ This is the content of the text  │ │
│ │ file that will be sent to        │ │
│ │ channels.                        │ │
│ │                                  │ │
│ │ It can have multiple lines and   │ │
│ │ formatting will be preserved.    │ │
│ └──────────────────────────────────┘ │
│                                      │
├──────────────────────────────────────┤
│         [Close]  [📥 Download]       │
└──────────────────────────────────────┘
```

### Preview Modal - Image

```
┌──────────────────────────────────────┐
│ 👁️ Preview: image.jpg           [X] │
├──────────────────────────────────────┤
│ Type: photo | Size: 245.3 KB        │
│                                      │
│        ┌──────────────────┐          │
│        │                  │          │
│        │   [Image shown   │          │
│        │    here with     │          │
│        │   full preview]  │          │
│        │                  │          │
│        └──────────────────┘          │
│                                      │
├──────────────────────────────────────┤
│         [Close]  [📥 Download]       │
└──────────────────────────────────────┘
```

### Preview Modal - Video

```
┌──────────────────────────────────────┐
│ 👁️ Preview: video.mp4           [X] │
├──────────────────────────────────────┤
│ Type: video | Size: 5.2 MB          │
│                                      │
│        ┌──────────────────┐          │
│        │  [Video Player]  │          │
│        │  ▶️ ⏸️ 🔊 ⏩ ⏪   │          │
│        │  [Progress Bar]  │          │
│        └──────────────────┘          │
│                                      │
├──────────────────────────────────────┤
│         [Close]  [📥 Download]       │
└──────────────────────────────────────┘
```

## Implementation Details

### Frontend Changes

**File**: `frontend/src/components/Projects.js`

#### New State Variables
```javascript
const [showPreviewModal, setShowPreviewModal] = useState(false);
const [previewFile, setPreviewFile] = useState(null);
const [previewContent, setPreviewContent] = useState('');
```

#### New Function: handleViewFile
```javascript
const handleViewFile = async (file) => {
  setPreviewFile(file);
  setPreviewContent('Loading...');
  setShowPreviewModal(true);

  if (file.file_type === 'text') {
    // Fetch text content via API
    const response = await axios.get(`/api/files/${file.id}/preview`);
    setPreviewContent(response.data);
  }
  // For media, content is loaded via <img> or <video> src
};
```

#### Updated Messages Display
Added View button to each file:
```javascript
<Button 
  variant="outline-primary" 
  size="sm"
  onClick={() => handleViewFile(file)}
>
  👁️ View
</Button>
```

#### Preview Modal Component
Renders different content based on file type:
- **Text**: Scrollable text area with monospace font
- **Photo**: `<img>` tag with `/api/files/:id/raw` source
- **Video**: `<video>` tag with controls
- **Other**: Download button

### API Endpoints Used

| Endpoint | Purpose | Used For |
|----------|---------|----------|
| `GET /api/files/:id/info` | Get file metadata | File details in list |
| `GET /api/files/:id/preview` | Get text content | Text file preview |
| `GET /api/files/:id/raw` | Serve raw file | Image/video preview |
| `GET /api/files/:id` | Download file | Download button |

## Styling

### Text Preview
```css
{
  maxHeight: '400px',
  overflowY: 'auto',
  backgroundColor: '#f8f9fa',
  fontFamily: 'monospace',
  whiteSpace: 'pre-wrap'
}
```

### Image Preview
```css
{
  maxWidth: '100%',
  maxHeight: '500px'
}
```

### Video Preview
```css
{
  maxWidth: '100%',
  maxHeight: '500px'
}
```

## User Flow

```
User clicks "Run"
    ↓
Run Confirmation Modal opens
    ↓
User sees list of files
    ↓
User clicks "👁️ View" on a file
    ↓
Preview Modal opens
    ↓
Content loads based on type:
  - Text: Fetch and display content
  - Image: Load via <img> tag
  - Video: Load via <video> tag
    ↓
User reviews content
    ↓
Options:
  - Close preview
  - Download file
  - Go back to run confirmation
```

## Edge Cases Handled

### 1. Large Text Files
- Scrollable container (max 400px)
- Preserves all content
- No truncation

### 2. Large Images
- Responsive sizing
- Maintains aspect ratio
- Fits within modal

### 3. Unsupported File Types
- Shows info message
- Provides download button
- Graceful fallback

### 4. Loading States
- Shows "Loading..." while fetching
- Prevents empty preview flash

### 5. Error Handling
```javascript
try {
  // Fetch content
} catch (error) {
  setPreviewContent('Error loading preview: ' + error.message);
}
```

## Benefits

### 1. **Verification**
Users can verify content before sending to channels

### 2. **Confidence**
See exactly what will be sent, no surprises

### 3. **Quick Review**
No need to download files to check content

### 4. **Error Prevention**
Catch wrong files before running campaign

### 5. **Convenience**
Preview and download in one place

## Testing Scenarios

### Test 1: Text File Preview
1. Create project with text file
2. Click "Run"
3. Click "👁️ View" on text file
4. **Expected**: Modal shows text content with formatting

### Test 2: Image Preview
1. Create project with image
2. Click "Run"
3. Click "👁️ View" on image
4. **Expected**: Modal shows image preview

### Test 3: Video Preview
1. Create project with video
2. Click "Run"
3. Click "👁️ View" on video
4. **Expected**: Modal shows video player with controls

### Test 4: Download
1. Open any preview
2. Click "📥 Download"
3. **Expected**: File downloads in new tab

### Test 5: Multiple Files
1. Create project with text + image
2. Click "Run"
3. Click "View" on text → See text
4. Close, click "View" on image → See image
5. **Expected**: Both previews work independently

## Performance

### Optimizations
1. **Lazy Loading**: Content only fetched when View clicked
2. **Caching**: Browser caches images/videos
3. **Efficient Rendering**: Conditional rendering based on file type
4. **No Pre-loading**: Files not loaded until needed

### Network Requests
- Text file: 1 request for content
- Image: 1 request for image data
- Video: 1 request for video data (streaming)

## Future Enhancements

Possible improvements:
- [ ] Syntax highlighting for code files
- [ ] PDF preview support
- [ ] Audio file preview
- [ ] Zoom controls for images
- [ ] Video thumbnail generation
- [ ] File size warnings for large files
- [ ] Preview in fullscreen mode
- [ ] Copy text content to clipboard

## Summary

The File Preview feature provides users with full visibility into what will be sent to their channels, combining convenience, verification, and confidence in a seamless interface.
