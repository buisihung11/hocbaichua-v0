import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

export const uploadthingRouter: FileRouter = {
  documentUploader: f({
    pdf: { maxFileSize: "32MB", maxFileCount: 10 },
    text: { maxFileSize: "4MB", maxFileCount: 10 },
    image: { maxFileSize: "16MB", maxFileCount: 10 },
  })
    .middleware(({ req }) => {
      // Get user from session - you can access headers from req
      // This is just a placeholder, adjust based on your auth setup
      const userId = req.headers.get("x-user-id");

      if (!userId) {
        throw new Error("Unauthorized");
      }

      return { userId };
    })
    .onUploadComplete(({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);

      return { uploadedBy: metadata.userId, fileUrl: file.url };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadthingRouter;
