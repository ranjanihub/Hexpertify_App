import React from "react";
import { IoClose } from "react-icons/io5";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  children?: React.ReactNode;
  width?: string;
}

const ModalComp = ({ open, setOpen, children, width = "700px" }: Props) => {
  return (
    <div
      className={`fixed flex-col z-50 flex justify-center items-center top-0 left-0 w-full h-screen bg-black/60 
      transition-opacity duration-300 ease-in-out 
      ${open ? "opacity-100 visible" : "opacity-0 invisible"}`}
    >
      <div className="flex w-[800px] justify-end items-center">
        <IoClose
          onClick={() => setOpen(false)}
          size={40}
          color="white"
          className="cursor-pointer"
        />
      </div>
      {/* Modal box */}
      <div
        className={`bg-white rounded-[32px] p-[30px] transform transition-all duration-300 ease-in-out 
        ${open ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        {children}
      </div>
    </div>
  );
};

export default ModalComp;
