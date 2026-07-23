import { LessonWorkbench } from "@/components/lesson-workbench";

export default function HomePage() {
  return (
    <main>
      <header className="hero">
        <div className="hero__eyebrow">TeachAI · curriculum retrieval</div>
        <h1>Plan a lesson with visible source context.</h1>
        <p>
          The local demonstration retrieves original synthetic curriculum
          fixtures, bounds the context, and streams a lesson plan or exercise set
          with source metadata.
        </p>
        <div className="hero__status">
          <span>Credential-free fixture mode</span>
          <span>Bounded context</span>
          <span>Streaming response</span>
        </div>
      </header>

      <LessonWorkbench />

      <footer>
        Public fixtures are synthetic and intended to reproduce the retrieval
        workflow, not to replace licensed curriculum materials.
      </footer>
    </main>
  );
}
