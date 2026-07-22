#!/usr/bin/env node
/**
 * Patches react-native-document-picker to work with React Native 0.83.2
 * Removes dependency on deprecated GuardedResultAsyncTask
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  'node_modules/react-native-document-picker/android/src/main/java/com/reactnativedocumentpicker/RNDocumentPickerModule.java'
);

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove the GuardedResultAsyncTask import
  content = content.replace(
    /import com\.facebook\.react\.bridge\.GuardedResultAsyncTask;\n/,
    ''
  );

  // Add Executor imports
  if (!content.includes('import java.util.concurrent.Executor;')) {
    content = content.replace(
      /import java\.util\.UUID;/,
      'import java.util.UUID;\nimport java.util.concurrent.Executor;\nimport java.util.concurrent.Executors;'
    );
  }

  // Replace the entire ProcessDataTask class
  const oldClass = /private static class ProcessDataTask extends GuardedResultAsyncTask<ReadableArray> \{[\s\S]*?^\s*\}/m;
  
  const newClass = `private static class ProcessDataTask {
    private final WeakReference<Context> weakContext;
    private final List<Uri> uris;
    private final String copyTo;
    private final Promise promise;
    private static final Executor executor = Executors.newSingleThreadExecutor();

    protected ProcessDataTask(ReactContext reactContext, List<Uri> uris, String copyTo, Promise promise) {
      this.weakContext = new WeakReference<>(reactContext.getApplicationContext());
      this.uris = uris;
      this.copyTo = copyTo;
      this.promise = promise;
    }

    public void executeOnExecutor() {
      executor.execute(() -> {
        try {
          WritableArray results = Arguments.createArray();
          for (Uri uri : uris) {
            results.pushMap(getMetadata(uri));
          }
          promise.resolve(results);
        } catch (Exception e) {
          e.printStackTrace();
          promise.reject("ProcessDataTask", e.getLocalizedMessage(), e);
        }
      });
    }

    private WritableMap getMetadata(Uri uri) {
      Context context = weakContext.get();
      if (context == null) {
        return Arguments.createMap();
      }
      ContentResolver contentResolver = context.getContentResolver();
      WritableMap map = Arguments.createMap();
      map.putString(FIELD_URI, uri.toString());
      map.putString(FIELD_TYPE, contentResolver.getType(uri));
      try (Cursor cursor = contentResolver.query(uri, null, null, null, null, null)) {
        if (cursor != null && cursor.moveToFirst()) {
          int displayNameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
          if (!cursor.isNull(displayNameIndex)) {
            String fileName = cursor.getString(displayNameIndex);
            map.putString(FIELD_NAME, fileName);
          } else {
            map.putNull(FIELD_NAME);
          }
          int mimeIndex = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_MIME_TYPE);
          if (!cursor.isNull(mimeIndex)) {
            map.putString(FIELD_TYPE, cursor.getString(mimeIndex));
          }
          int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
          if (cursor.isNull(sizeIndex)) {
            map.putNull(FIELD_SIZE);
          } else {
            map.putDouble(FIELD_SIZE, cursor.getLong(sizeIndex));
          }
        }
      }

      prepareFileUri(context, map, uri);
      return map;
    }

    private void prepareFileUri(Context context, WritableMap map, Uri uri) {
      if (copyTo == null) {
        map.putNull(FIELD_FILE_COPY_URI);
      } else {
        copyFileToLocalStorage(context, map, uri);
      }
    }

    private void copyFileToLocalStorage(Context context, WritableMap map, Uri uri) {
      File dir = context.getCacheDir();
      if (copyTo.equals("documentDirectory")) {
        dir = context.getFilesDir();
      }
      dir = new File(dir, UUID.randomUUID().toString());
      try {
        boolean didCreateDir = dir.mkdir();
        if (!didCreateDir) {
          throw new IOException("failed to create directory at " + dir.getAbsolutePath());
        }
        String fileName = map.getString(FIELD_NAME);
        if (fileName == null) {
          fileName = String.valueOf(System.currentTimeMillis());
        }
        File destFile = safeGetDestination(new File(dir, fileName), dir.getCanonicalPath());
        Uri copyPath = copyFile(context, uri, destFile);
        map.putString(FIELD_FILE_COPY_URI, copyPath.toString());
      } catch (Exception e) {
        e.printStackTrace();
        map.putNull(FIELD_FILE_COPY_URI);
        map.putString(FIELD_COPY_ERROR, e.getLocalizedMessage());
      }
    }

    public File safeGetDestination(File destFile, String expectedDir) throws IllegalArgumentException, IOException {
      String canonicalPath = destFile.getCanonicalPath();
      if (!canonicalPath.startsWith(expectedDir)) {
        throw new IllegalArgumentException("The copied file is attempting to write outside of the target directory.");
      }
      return destFile;
    }

    public static Uri copyFile(Context context, Uri uri, File destFile) throws IOException {
      try(InputStream inputStream = context.getContentResolver().openInputStream(uri);
          FileOutputStream outputStream = new FileOutputStream(destFile)) {
        byte[] buf = new byte[8192];
        int len;
        while ((len = inputStream.read(buf)) > 0) {
          outputStream.write(buf, 0, len);
        }
        return Uri.fromFile(destFile);
      }
    }
  }`;

  content = content.replace(oldClass, newClass);

  // Update the execute call to executeOnExecutor
  content = content.replace(
    /new ProcessDataTask\(getReactApplicationContext\(\), uris, copyTo, promise\)\.execute\(\);/,
    'new ProcessDataTask(getReactApplicationContext(), uris, copyTo, promise).executeOnExecutor();'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully patched react-native-document-picker');
} catch (error) {
  console.error('❌ Failed to patch react-native-document-picker:', error.message);
  process.exit(1);
}
