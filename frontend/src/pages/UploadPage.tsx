import {
  Button,
  Callout,
  Card,
  Divider,
  Elevation,
  FileInput,
  H5,
  HTMLTable,
  Intent,
  NonIdealState,
  ProgressBar,
  Tag,
} from '@blueprintjs/core';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { apiService, UploadStatusResponse } from '../services/api';

type UploadRun = {
  uploadId: string;
  sourceLabel: string;
  createdAt: number;
  status?: UploadStatusResponse;
  localError?: string;
};

const POLL_MS = 1200;
const PUBLIC_BASE = process.env.PUBLIC_URL ?? '';

const FIXTURES = [
  { fileName: 'quick-sample.csv', label: 'Test brief sample' },
  { fileName: 'mixed-errors.csv', label: 'Test mixed errors' },
  { fileName: 'large-sample.csv', label: 'Test large upload' },
  { fileName: 'timeout-stress.csv', label: 'Test timeout stress' },
];

const UploadPage: React.FC = () => {
  const [uploads, setUploads] = useState<UploadRun[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const activeIds = useMemo(
    () =>
      uploads
        .filter((run) => {
          const state = run.status?.status;
          return !state || (state !== 'done' && state !== 'error');
        })
        .map((run) => run.uploadId),
    [uploads]
  );

  const summary = useMemo(() => {
    let inProgress = 0;
    let done = 0;
    let failed = 0;
    for (const run of uploads) {
      const status = run.status?.status;
      if (!status || status === 'unprocessed' || status === 'processing') inProgress += 1;
      if (status === 'done') done += 1;
      if (status === 'error') failed += 1;
    }
    return {
      total: uploads.length,
      inProgress,
      done,
      failed,
    };
  }, [uploads]);

  useEffect(() => {
    if (activeIds.length === 0) return;

    let cancelled = false;

    const pollOnce = async () => {
      await Promise.all(
        activeIds.map(async (uploadId) => {
          try {
            const status = await apiService.getUploadStatus(uploadId);
            if (cancelled) return;
            setUploads((prev) =>
              prev.map((run) => (run.uploadId === uploadId ? { ...run, status, localError: undefined } : run))
            );
          } catch (error) {
            if (cancelled) return;
            if (axios.isAxiosError(error) && error.response?.status === 404) {
              return;
            }
            const message =
              axios.isAxiosError(error)
                ? error.response?.data?.error ?? error.message
                : 'Failed to fetch upload status';
            setUploads((prev) =>
              prev.map((run) => (run.uploadId === uploadId ? { ...run, localError: message } : run))
            );
          }
        })
      );
    };

    void pollOnce();
    const timer = setInterval(() => {
      void pollOnce();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeIds]);

  const parseError = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.error ?? error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unexpected upload error';
  };

  const runUpload = async (fileFactory: () => Promise<File>, sourceLabel: string) => {
    setSubmitting(true);
    setPageError(null);
    try {
      const file = await fileFactory();
      const { uploadId } = await apiService.uploadFile(file);
      setUploads((prev) => [{ uploadId, sourceLabel, createdAt: Date.now() }, ...prev]);
    } catch (error) {
      setPageError(parseError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const loadFixtureAsFile = async (fileName: string): Promise<File> => {
    const url = `${PUBLIC_BASE}/test-data/${fileName}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to load fixture file: ${fileName}`);
    }
    const contents = await response.text();
    return new File([contents], fileName, { type: 'text/csv' });
  };

  const uploadFixture = async (fileName: string, label: string) => {
    await runUpload(() => loadFixtureAsFile(fileName), `Fixture: ${label}`);
  };

  const uploadChosenFile = async () => {
    if (!selectedFile) {
      setPageError('Choose a CSV file before uploading.');
      return;
    }
    await runUpload(async () => selectedFile, `Custom: ${selectedFile.name}`);
    setSelectedFile(null);
  };

  const statusIntent = (status?: UploadStatusResponse['status']) => {
    if (!status || status === 'unprocessed' || status === 'processing') return Intent.PRIMARY;
    if (status === 'done') return Intent.SUCCESS;
    return Intent.DANGER;
  };

  const clearCompleted = () => {
    setUploads((prev) => prev.filter((run) => run.status?.status !== 'done' && run.status?.status !== 'error'));
  };

  return (
    <div className="upload-lab-page">
      <section className="upload-lab-header">
        <h1>File Upload Validation Lab</h1>
        <p>Run realistic upload scenarios and watch queue processing, progress tracking, and failure details in real time.</p>
      </section>

      {pageError && (
        <Callout intent={Intent.DANGER} className="upload-lab-alert">
          {pageError}
        </Callout>
      )}

      <section className="upload-lab-grid">
        <Card elevation={Elevation.TWO} className="upload-lab-card">
          <H5>Scenario Actions</H5>
          <p>These buttons upload static CSV fixtures from <code>/public/test-data</code>.</p>
          <div className="upload-lab-actions">
            {FIXTURES.map((fixture, idx) => (
              <Button
                key={fixture.fileName}
                intent={idx === 0 ? Intent.PRIMARY : idx === 2 ? Intent.SUCCESS : Intent.WARNING}
                loading={submitting}
                onClick={() => void uploadFixture(fixture.fileName, fixture.label)}
              >
                {fixture.label}
              </Button>
            ))}
          </div>

          <Divider className="upload-lab-divider" />

          <div className="upload-lab-upload-row">
            <FileInput
              text={selectedFile ? selectedFile.name : 'Choose a CSV file...'}
              inputProps={{
                accept: '.csv,text/csv',
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                },
              }}
              fill
            />
            <Button intent={Intent.PRIMARY} disabled={!selectedFile || submitting} loading={submitting} onClick={() => void uploadChosenFile()}>
              Upload selected
            </Button>
          </div>
        </Card>

        <Card elevation={Elevation.TWO} className="upload-lab-card">
          <H5>Run Summary</H5>
          <div className="upload-lab-tags">
            <Tag minimal large intent={Intent.NONE}>Total: {summary.total}</Tag>
            <Tag minimal large intent={Intent.PRIMARY}>In progress: {summary.inProgress}</Tag>
            <Tag minimal large intent={Intent.SUCCESS}>Done: {summary.done}</Tag>
            <Tag minimal large intent={Intent.DANGER}>Errored: {summary.failed}</Tag>
          </div>
          <Button minimal onClick={clearCompleted} disabled={uploads.length === 0}>
            Clear completed
          </Button>
        </Card>
      </section>

      <section className="upload-lab-results">
        {uploads.length === 0 ? (
          <NonIdealState title="No uploads yet" description="Start with a sample upload to verify backend behavior visually." />
        ) : (
          uploads.map((run) => {
            const status = run.status?.status ?? 'unprocessed';
            const progressPercent = run.status?.progressPercent ?? 0;
            const progress = run.status?.progress ?? `${progressPercent}%`;
            return (
              <Card key={run.uploadId} elevation={Elevation.ONE} className="upload-run-card">
                <div className="upload-run-header">
                  <div>
                    <h3>{run.sourceLabel}</h3>
                    <code>{run.uploadId}</code>
                  </div>
                  <Tag intent={statusIntent(run.status?.status)}>{status.toUpperCase()}</Tag>
                </div>

                <ProgressBar
                  value={Math.max(0, Math.min(1, progressPercent / 100))}
                  stripes={status === 'processing' || status === 'unprocessed'}
                  animate={status === 'processing' || status === 'unprocessed'}
                  intent={statusIntent(run.status?.status)}
                />

                <div className="upload-run-meta">
                  <span>Progress: {progress}</span>
                  <span>Total: {run.status?.totalRecords ?? 0}</span>
                  <span>Processed: {run.status?.processedRecords ?? 0}</span>
                  <span>Failed: {run.status?.failedRecords ?? 0}</span>
                  <span>Started: {new Date(run.createdAt).toLocaleTimeString()}</span>
                </div>

                {run.localError && (
                  <Callout intent={Intent.DANGER} className="upload-run-callout">
                    {run.localError}
                  </Callout>
                )}

                {run.status?.errorMessage && (
                  <Callout intent={Intent.DANGER} className="upload-run-callout">
                    {run.status.errorMessage}
                  </Callout>
                )}

                {run.status?.details && run.status.details.length > 0 && (
                  <div className="upload-run-table-wrap">
                    <H5>Failure details ({run.status.details.length})</H5>
                    <HTMLTable striped interactive className="upload-run-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {run.status.details.slice(0, 8).map((detail, idx) => (
                          <tr key={`${run.uploadId}-${idx}`}>
                            <td>{detail.name || '-'}</td>
                            <td>{detail.email || '-'}</td>
                            <td>{detail.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </HTMLTable>
                    {run.status.details.length > 8 && (
                      <small>Showing first 8 failures for readability.</small>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
};

export default UploadPage;
