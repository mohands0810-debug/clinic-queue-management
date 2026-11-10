import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ThermalPrintSlipProps {
  tokenNumber: number;
  patientName: string;
  age: number;
  isSenior?: boolean;
  tokenId?: string;
  clinicName?: string;
  doctorName?: string;
  address?: string;
  phone?: string;
  dateStr?: string;
}

export const ThermalPrintSlip: React.FC<ThermalPrintSlipProps> = ({
  tokenNumber,
  patientName,
  age,
  isSenior,
  tokenId,
  clinicName = 'DHANVANTRI CLINIC',
  doctorName = 'Dr Yogesh',
  address = 'Sandhya Theater Complex, VP Road, BTM Layout',
  phone = '+91 98765 43210',
  dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
}) => {
  const trackerUrl = tokenId ? `${window.location.origin}/status?id=${tokenId}` : window.location.origin;

  return (
    <div className="print-slip-area hidden print:block text-black bg-white p-4 font-mono max-w-[80mm] mx-auto text-center border border-dashed border-gray-400">
      <div className="border-b-2 border-black pb-2 mb-2">
        <h2 className="text-xl font-black uppercase tracking-wider">{clinicName}</h2>
        <p className="text-sm font-bold">{doctorName}</p>
        <p className="text-[10px] leading-tight text-gray-700">{address}</p>
        <p className="text-[10px] font-bold">Ph: {phone}</p>
      </div>

      <div className="py-2 border-b-2 border-black">
        <span className="text-xs uppercase font-bold tracking-widest block">YOUR TOKEN NUMBER</span>
        <div className="text-6xl font-black tracking-tight my-1">
          #{tokenNumber}
        </div>
        {isSenior && (
          <div className="text-xs font-black uppercase tracking-wider border border-black px-2 py-0.5 inline-block">
            *** SENIOR CARE LANE ***
          </div>
        )}
      </div>

      <div className="text-left text-xs space-y-1 py-2 border-b border-black">
        <div className="flex justify-between">
          <span className="font-bold">Patient:</span>
          <span className="font-semibold truncate max-w-[150px]">{patientName}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Age:</span>
          <span>{age} years</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Date & Time:</span>
          <span className="text-[10px]">{dateStr}</span>
        </div>
      </div>

      {/* QR Code for Family & Smartphone Tracking */}
      <div className="py-3 flex flex-col items-center justify-center">
        <QRCodeSVG value={trackerUrl} size={90} level="M" />
        <p className="text-[9px] font-bold uppercase mt-1">Scan QR to track live wait time</p>
      </div>

      <div className="border-t-2 border-black pt-2 text-[10px] leading-tight">
        <p className="font-bold">Please wait in the clinic lobby.</p>
        <p>Watch the TV board for your token announcement.</p>
        <p className="mt-2 text-[8px] text-gray-500">KSIT Community Project 25BCP308</p>
      </div>
    </div>
  );
};

