import React from "react";
import ReactDOM from "react-dom";
import TableList from "../views/TableList.jsx";
import Footer from "../components/Footer/Footer.jsx";
import crypto_icons from "../json/coins.js";

class CryptoList extends React.Component {
  render(){
    return(
      <div className="wrapper">
        <div
          className="main-panel"
          data="blue"
        >
          <TableList icons={crypto_icons} twMode='big'/>
        </div>
      </div>
    );
  }
}

export default CryptoList;
