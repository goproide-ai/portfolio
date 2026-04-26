export default function SleevPage() {
  return (
    <div className="w-full" style={{ marginTop: "-64px" }}>
      <iframe
        src="/sleev/index.html"
        className="w-full border-0"
        style={{ height: "100vh", minHeight: "100vh" }}
        title="Sleev — Arm Support Robot"
        allowFullScreen
      />
    </div>
  );
}
