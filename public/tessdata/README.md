Place the trained data files used by Tesseract.js in this directory for offline OCR.

Required files:
- `jpn.traineddata.gz`
- `eng.traineddata.gz`

The app defaults `langPath` to `/tessdata`, so these files should be available from:
- `/tessdata/jpn.traineddata.gz`
- `/tessdata/eng.traineddata.gz`

Keep the files local in production to preserve the app's local-first/privacy-oriented behavior.
