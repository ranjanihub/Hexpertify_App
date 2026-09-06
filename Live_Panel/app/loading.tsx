import Loader from "@/components/Loader";
import React from "react";

interface ILoading {
  [key: string]: any;
}

const Loading: React.FC<ILoading> = (props) => {
  return <Loader />;
};

export default Loading;
