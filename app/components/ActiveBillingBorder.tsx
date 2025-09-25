"use client";

import { useBillingType } from "../contexts/BillingTypeContext";

const ActiveBillingBorder = () => {
  const { activeBillingType } = useBillingType();

  if (!activeBillingType) {
    return null;
  }

  const borderColor = activeBillingType.colorCode;

  return (
    <>
      {/* Top banner */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center"
        style={{
          height: "80px",
          backgroundColor: borderColor,
        }}
      >
        <div className="text-white text-xl font-semibold">
          Active Billing Type: {activeBillingType.billingType.title}
        </div>
      </div>
      {/* Top border */}
      <div
        className="fixed left-0 right-0 z-50"
        style={{
          top: "80px",
          height: "16px",
          backgroundColor: borderColor,
        }}
      />
      {/* Left border */}
      <div
        className="fixed top-0 left-0 bottom-0 z-50"
        style={{
          width: "4px",
          backgroundColor: borderColor,
        }}
      />
      {/* Right border */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50"
        style={{
          width: "4px",
          backgroundColor: borderColor,
        }}
      />
      {/* Bottom border */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          height: "16px",
          backgroundColor: borderColor,
        }}
      />
    </>
  );
};

export default ActiveBillingBorder;
