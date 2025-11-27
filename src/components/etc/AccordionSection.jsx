import React, { useState } from "react";

const AccordionSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="content-accordion-section">
      <div
        className="content-accordion-header"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{title}</span>
        <span className="content-accordion-arrow">{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen && <div className="content-accordion-body">{children}</div>}
    </div>
  );
};

export default AccordionSection;