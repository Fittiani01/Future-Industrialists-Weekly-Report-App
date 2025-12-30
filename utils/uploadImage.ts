import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "../firebase";
import { compressImage } from "./compressImage";

interface UploadOptions {
    maxWidth?: number;
    quality?: number;
}

export const uploadReportImage = async (
    file: File, 
    reportId: string, 
    visitId: string,
    options: UploadOptions = {}
): Promise<string> => {
    try {
        // 1. Compress with custom options if provided
        // Default to 2048px width and 0.90 quality if not specified
        const maxWidth = options.maxWidth || 2048;
        const quality = options.quality || 0.90;

        const compressedFile = await compressImage(file, maxWidth, quality);
        
        // 2. Upload to Storage
        // Path: reporter/reports/{reportId}/visits/{visitId}/{timestamp}_{random}.jpg
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const extension = compressedFile.type === 'image/png' ? 'png' : 'jpg';
        const storagePath = `reporter/reports/${reportId}/visits/${visitId}/${timestamp}_${random}.${extension}`;
        
        const storageRef = ref(storage, storagePath);
        
        // uploadBytes can throw StorageError which is an object
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // 3. Save metadata to Firestore
        await addDoc(collection(db, "reporter_images"), {
            reportId,
            visitId,
            url: downloadURL,
            path: storagePath,
            createdAt: serverTimestamp(),
            originalName: file.name
        });
        
        return downloadURL;
    } catch (error: any) {
        // Detailed error logging
        const errorMessage = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
        const errorCode = error.code ? ` (Code: ${error.code})` : '';
        console.error(`Error uploading image '${file.name}': ${errorMessage}${errorCode}`);
        
        // Rethrow a clean Error object to ensure upstream callers get a message
        throw new Error(`Upload failed: ${errorMessage}${errorCode}`);
    }
};