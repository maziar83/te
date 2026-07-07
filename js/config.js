const CONFIG = {
    PDF_FILES: [
        { id: 'book1', title: 'کتاب اول', filename: 'book1.pdf' },
        { id: 'book2', title: 'کتاب دوم', filename: 'book2.pdf' },
    ],
    STORAGE_KEY: 'pdf_annotations',
    DEFAULT_COLOR: '#ffeb3b',
    DEFAULT_THICKNESS: 4,
};

pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';