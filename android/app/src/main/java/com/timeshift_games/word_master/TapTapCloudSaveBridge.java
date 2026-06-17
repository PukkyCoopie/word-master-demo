package com.timeshift_games.word_master;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.taptap.sdk.cloudsave.ArchiveData;
import com.taptap.sdk.cloudsave.ArchiveMetadata;
import com.taptap.sdk.cloudsave.TapTapCloudSave;
import com.taptap.sdk.cloudsave.internal.TapCloudSaveRequestCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

final class TapTapCloudSaveBridge {

    private static final String UPLOAD_FILE_NAME = "cloud_save_upload.json";

    private TapTapCloudSaveBridge() {}

    static File writeTempArchiveFile(Context context, String dataJson) throws IOException {
        File file = new File(context.getCacheDir(), UPLOAD_FILE_NAME);
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(dataJson.getBytes(StandardCharsets.UTF_8));
        }
        return file;
    }

    static ArchiveMetadata buildMetadata(
        String archiveName,
        String archiveSummary,
        String archiveExtra,
        int archivePlaytime
    ) {
        return new ArchiveMetadata(archiveName, archiveSummary, archiveExtra, archivePlaytime);
    }

    static JSObject archiveDataToJson(ArchiveData archive) {
        JSObject ret = new JSObject();
        if (archive == null) {
            return ret;
        }
        ret.put("uuid", archive.getUuid());
        ret.put("fileId", archive.getFileId());
        ret.put("name", archive.getName());
        ret.put("summary", archive.getSummary());
        ret.put("extra", archive.getExtra());
        ret.put("playtime", archive.getPlaytime());
        ret.put("saveSize", archive.getSaveSize());
        ret.put("coverSize", archive.getCoverSize());
        ret.put("createdTime", archive.getCreatedTime());
        ret.put("modifiedTime", archive.getModifiedTime());
        return ret;
    }

    static void getArchiveList(TapCloudSaveRequestCallback callback) {
        TapTapCloudSave.getArchiveList(callback);
    }

    static void createArchive(
        ArchiveMetadata metadata,
        String archiveFilePath,
        TapCloudSaveRequestCallback callback
    ) {
        TapTapCloudSave.createArchive(metadata, archiveFilePath, "", callback);
    }

    static void updateArchive(
        String archiveUuid,
        ArchiveMetadata metadata,
        String archiveFilePath,
        TapCloudSaveRequestCallback callback
    ) {
        TapTapCloudSave.updateArchive(archiveUuid, metadata, archiveFilePath, "", callback);
    }

    static void deleteArchive(String archiveUuid, TapCloudSaveRequestCallback callback) {
        TapTapCloudSave.deleteArchive(archiveUuid, callback);
    }

    static void getArchiveData(
        String archiveUuid,
        String archiveFileId,
        TapCloudSaveRequestCallback callback
    ) {
        TapTapCloudSave.getArchiveData(archiveUuid, archiveFileId, callback);
    }

    static abstract class SimpleRequestCallback implements TapCloudSaveRequestCallback {
        @Override
        public void onArchiveCreated(ArchiveData archiveData) {
            onArchiveResult(archiveData);
        }

        @Override
        public void onArchiveUpdated(ArchiveData archiveData) {
            onArchiveResult(archiveData);
        }

        @Override
        public void onArchiveDeleted(ArchiveData archiveData) {
            onArchiveResult(archiveData);
        }

        protected void onArchiveResult(ArchiveData archiveData) {}

        @Override
        public void onArchiveCoverResult(byte[] bytes) {
            onBytesResult(bytes);
        }

        protected void onBytesResult(byte[] bytes) {}

        @Override
        public void onArchiveListResult(List<ArchiveData> list) {}

        @Override
        public void onArchiveDataResult(byte[] bytes) {
            onBytesResult(bytes);
        }
    }
}
