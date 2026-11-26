import { useEffect, useState } from "react";
import Exp4App from "../library_resource_management/exp4/src/app.jsx";

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const openExp4 = () => {
    window.history.pushState({}, "", "/exp4");
    setPathname("/exp4");
  };

  const openHome = () => {
    window.history.pushState({}, "", "/");
    setPathname("/");
  };

  if (pathname === "/exp4" || pathname === "/exp4/") {
    return (
      <div className="min-h-screen bg-[#f2f2f2] py-8 px-4">
        <div className="max-w-[780px] mx-auto mb-3">
          <button
            type="button"
            onClick={openHome}
            className="text-sm text-[#1a73e8] underline cursor-pointer bg-transparent border-0 p-0"
          >
            &larr; Back to Experiments Launcher
          </button>
        </div>
        <Exp4App />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] py-8 px-4 font-[Arial,sans-serif] text-[#222222]">
      <div className="max-w-[650px] mx-auto bg-white border border-[#cccccc] p-6">
        <h1 className="text-2xl font-bold text-center mt-0 mb-1">
          Library Resource Management
        </h1>
        <p className="text-sm text-[#555555] text-center mb-6">
          Web Technology Practical Experiments (1 to 4)
        </p>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f5f5f5]">
              <th className="border border-[#cccccc] p-2.5 text-left">Experiment</th>
              <th className="border border-[#cccccc] p-2.5 text-left">Topic</th>
              <th className="border border-[#cccccc] p-2.5 text-left">Open</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#cccccc] p-2.5 font-bold">Experiment 1</td>
              <td className="border border-[#cccccc] p-2.5">HTML and CSS Form Interface</td>
              <td className="border border-[#cccccc] p-2.5">
                <a
                  href="/exp1/"
                  className="inline-block bg-[#1a73e8] hover:bg-[#1558b0] text-white px-3 py-1.5 no-underline text-xs"
                >
                  Open Exp 1
                </a>
              </td>
            </tr>
            <tr>
              <td className="border border-[#cccccc] p-2.5 font-bold">Experiment 2</td>
              <td className="border border-[#cccccc] p-2.5">JavaScript Validation &amp; user.json</td>
              <td className="border border-[#cccccc] p-2.5">
                <a
                  href="/exp2/"
                  className="inline-block bg-[#1a73e8] hover:bg-[#1558b0] text-white px-3 py-1.5 no-underline text-xs"
                >
                  Open Exp 2
                </a>
              </td>
            </tr>
            <tr>
              <td className="border border-[#cccccc] p-2.5 font-bold">Experiment 3</td>
              <td className="border border-[#cccccc] p-2.5">Express.js Update, Alter &amp; Delete</td>
              <td className="border border-[#cccccc] p-2.5">
                <a
                  href="/exp3/"
                  className="inline-block bg-[#1a73e8] hover:bg-[#1558b0] text-white px-3 py-1.5 no-underline text-xs"
                >
                  Open Exp 3
                </a>
              </td>
            </tr>
            <tr>
              <td className="border border-[#cccccc] p-2.5 font-bold">Experiment 4</td>
              <td className="border border-[#cccccc] p-2.5">React.js Update Counter (count.json)</td>
              <td className="border border-[#cccccc] p-2.5">
                <button
                  type="button"
                  onClick={openExp4}
                  className="bg-[#1a73e8] hover:bg-[#1558b0] text-white px-3 py-1.5 border-0 cursor-pointer text-xs"
                >
                  Open Exp 4
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
