export default function JumpButton({ className, onClick }) {
  return React.createElement(
    "div",
    { contentEditable: false, className: `BEditor-jumpButton ${className}`, onClick: onClick },
    React.createElement(
      "svg",
      { viewBox: [0, 0, 21, 12] },
      React.createElement(
        "g",
        { stroke: "none", strokeWidth: "1", fill: "none", fillRule: "evenodd" },
        React.createElement("path", {
          d: "M14.4768224,15.3383528 L14.4768224,1.95370621 C14.4768224,0.926881954 13.6365238,0.0867530155 12.6094923,0.0867530155 L7.45877326,0.0867530155 L9.48171425,2.10928564 L8.61029351,2.98053047 L5.0934884,-0.535564717 L8.61029351,-4.0516599 L9.48171425,-3.18041508 L7.45877326,-1.15788245 L12.6406144,-1.15788245 C14.3523337,-1.15788245 15.7528313,0.242332448 15.7528313,1.95370621 L15.7528313,15.3383528 C15.7528313,16.1407697 14.4768224,16.1624961 14.4768224,15.3383528 Z",
          fill: "#000000",
          fillRule: "nonzero",
          transform: "translate(10.723588, 4.570032) scale(-1, 1) rotate(-270.000000) translate(-10.723588, -4.570032)"
        })
      )
    )
  );
}