import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "../firebase";
import { compressImage } from "./compressImage";

export const uploadReportImage = async (file: File, reportId: string, visitId: string): Promise<string> => {
    try {
        // 1. Compress
        const compressedFile = await compressImage(file);
        
        // 2. Upload to Storage
        // Path: reporter/reports/{reportId}/visits/{visitId}/{timestamp}_{random}.jpg
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const extension = compressedFile.type === 'image/png' ? 'png' : 'jpg';
        const storagePath = `reporter/reports/${reportId}/visits/${visitId}/${timestamp}_${random}.${extension}`;
        
        const storageRef = ref(storage, storagePath);
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
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
};