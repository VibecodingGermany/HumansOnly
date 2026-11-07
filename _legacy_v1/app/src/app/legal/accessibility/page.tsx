export default function AccessibilityPage() {
    return (
        <main className="legal-doc-page">
            <h1>Accessibility Statement</h1>
            <p>Last updated: March 2, 2026</p>

            <section>
                <h2>Commitment</h2>
                <p>
                    Humans Only is being developed to remain accessible across devices and assistive technologies. We
                    continuously improve keyboard navigation, contrast, semantic markup, and screen-reader compatibility.
                </p>
            </section>

            <section>
                <h2>Current Status</h2>
                <p>
                    Accessibility improvements are ongoing while the platform evolves. Some areas may not yet be fully
                    optimized for all assistive workflows.
                </p>
            </section>

            <section>
                <h2>Feedback</h2>
                <p>
                    If you encounter accessibility barriers, contact us directly at{" "}
                    <a href="mailto:d.westermann@ol-mg.de">d.westermann@ol-mg.de</a>.
                </p>
            </section>
        </main>
    );
}
