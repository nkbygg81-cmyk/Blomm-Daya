import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate upload URL for file storage
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get file URL by storage ID
export const getFileUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Store file reference
export const storeFileReference = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    uploadedBy: v.optional(v.string()),
  },
  returns: v.id("fileReferences"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("fileReferences", {
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      uploadedBy: args.uploadedBy,
      uploadedAt: Date.now(),
    });
  },
});
