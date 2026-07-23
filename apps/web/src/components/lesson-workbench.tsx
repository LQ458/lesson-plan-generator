"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  requestGenerationStream,
  type StreamMetadata
} from "@/lib/sse";

type OutputKind = "lesson-plans" | "exercises";

const subjects = [
  "Mathematics",
  "Science",
  "English Language Arts",
  "History",
  "Geography",
  "Visual Arts"
];

export function LessonWorkbench() {
  const [kind, setKind] = useState<OutputKind>("lesson-plans");
  const [subject, setSubject] = useState("Mathematics");
  const [grade, setGrade] = useState("7");
  const [topic, setTopic] = useState("Ratios and proportional reasoning");
  const [requirements, setRequirements] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [content, setContent] = useState("");
  const [metadata, setMetadata] = useState<StreamMetadata>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const abortController = useRef<AbortController | undefined>(undefined);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    setLoading(true);
    setContent("");
    setMetadata(undefined);
    setError("");

    try {
      await requestGenerationStream(
        kind,
        { subject, grade, topic, requirements, durationMinutes },
        {
          onMetadata: setMetadata,
          onToken(text) {
            setContent((current) => current + text);
          },
          onDone() {
            setLoading(false);
          }
        },
        fetch,
        controller.signal
      );
    } catch (caught) {
      if (controller.signal.aborted) {
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "The request could not be completed."
      );
      setLoading(false);
    }
  }

  return (
    <section className="workbench" aria-label="Lesson planning workspace">
      <form className="panel panel--form" onSubmit={submit}>
        <div className="mode-switch" aria-label="Output type">
          <button
            className={kind === "lesson-plans" ? "is-active" : ""}
            type="button"
            onClick={() => setKind("lesson-plans")}
          >
            Lesson plan
          </button>
          <button
            className={kind === "exercises" ? "is-active" : ""}
            type="button"
            onClick={() => setKind("exercises")}
          >
            Exercises
          </button>
        </div>

        <div className="field">
          <label htmlFor="subject">Subject</label>
          <select
            id="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          >
            {subjects.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="grade">Grade</label>
            <input
              id="grade"
              maxLength={40}
              required
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="duration">Minutes</label>
            <input
              id="duration"
              type="number"
              min={15}
              max={180}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="topic">Topic</label>
          <input
            id="topic"
            maxLength={160}
            required
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="requirements">
            Additional requirements <span>optional</span>
          </label>
          <textarea
            id="requirements"
            maxLength={2000}
            rows={4}
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
            placeholder="For example: include a collaborative activity."
          />
        </div>

        <button className="primary-button" disabled={loading} type="submit">
          {loading
            ? "Streaming…"
            : kind === "lesson-plans"
              ? "Generate lesson plan"
              : "Generate exercises"}
        </button>
      </form>

      <section className="panel panel--output" aria-live="polite">
        <div className="output-heading">
          <div>
            <span className="section-label">Streamed output</span>
            <h2>{content ? topic : "Ready for a topic"}</h2>
          </div>
          {metadata && (
            <span
              className={`retrieval-badge retrieval-badge--${metadata.retrieval.status}`}
            >
              {metadata.retrieval.status === "ok"
                ? `${metadata.sources.length} sources`
                : "General fallback"}
            </span>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {!content && !error && (
          <div className="empty-state">
            <div className="empty-state__mark">T</div>
            <p>
              Submit the fixture example to see retrieval metadata and output
              arrive over a preserved stream.
            </p>
          </div>
        )}
        {content && <article className="generated-content">{content}</article>}

        {metadata && (
          <aside className="source-panel">
            <div className="source-panel__heading">
              <strong>Retrieval context</strong>
              <span>
                {metadata.retrieval.contextCharacters.toLocaleString()} /{" "}
                {metadata.retrieval.contextLimit.toLocaleString()} characters
              </span>
            </div>
            {metadata.sources.length > 0 ? (
              <ul>
                {metadata.sources.map((source) => (
                  <li key={source.id}>
                    <span>{source.topic}</span>
                    <small>
                      {source.id} · {source.license}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                {metadata.retrieval.mode === "fixture"
                  ? "No public fixture matched all three filters."
                  : "The external retrieval service returned no matching context."}{" "}
                The response does not claim a retrieved source.
              </p>
            )}
          </aside>
        )}
      </section>
    </section>
  );
}
