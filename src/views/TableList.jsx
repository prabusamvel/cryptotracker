import React from "react";

// reactstrap components
import {
  Card,
  CardBody,
  Table,
  Row,
  Col,
} from "reactstrap";

import Footer from "../components/Footer/Footer.jsx";
import io from 'socket.io-client';
import ReactTable from "react-table";
import 'react-table/react-table.css';

const socket = io('https://coincap.io', {autoConnect: false});
const webSocket = new WebSocket('wss://ws.coincap.io/trades/binance');

function formatMoney(n, c, d, t) {
  var c = isNaN(c = Math.abs(c)) ? 2 : c,
    d = d == undefined ? "." : d,
    t = t == undefined ? "," : t,
    s = n < 0 ? "-" : "",
    i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
    j = (j = i.length) > 3 ? j % 3 : 0;

  return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
}
function numShort(value, twMode = 'sml'){
  if(twMode === 'big'){
    if(value < 1000000){
      return formatMoney(value, 2, ".", ",");
    }else if(value < 100000000){
      return formatMoney((value/1000000), 2, ".", ",")+'m';
    }else{
      return formatMoney((value/1000000000), 2, ".", ",")+'b';
    }
  }
  return formatMoney(value, 2, ".", ",");
}

var coinCache = [];

var checker;

class Tables extends React.Component {

  constructor(props){
    super(props);
    let coinsIcons = [];
    for(let coin in this.props.icons){
        coinsIcons[coin] = require('../assets/img/crypto-icons/'+coin+'.png');
    }
    let icon404 = require('../assets/img/404.png');
    this.state = {
      isLoaded: false,
      error: '',
      coins : [],
      coinIndex : {},
      coinNameIndex : {},
      mshow: false,
      isVisible: true,
      dropdownOpen: false,
      swapData:{
        fromCoins: [
          {
             text: "Blackcoin",
             value: "BLK",
             image: "https://shapeshift.io/images/coins-sm/blackcoin.png"
          },
          {
            text: "BitcoinCash",
            value: "BCH",
            image: "https://shapeshift.io/images/coins-sm/bitcoincash.png"
          }
        ],
        toCoins: [
          {
             text: "Blackcoin",
             value: "BLK",
             image: "https://shapeshift.io/images/coins-sm/blackcoin.png"
          },
          {
            text: "BitcoinCash",
            value: "BCH",
            image: "https://shapeshift.io/images/coins-sm/bitcoincash.png"
          }
        ],
        fromCoin: {
           text: "Blackcoin",
           value: "BLK",
           image: "https://shapeshift.io/images/coins-sm/blackcoin.png"
        },
        toCoin: {
          text: "BitcoinCash",
          value: "BCH",
          image: "https://shapeshift.io/images/coins-sm/bitcoincash.png"
        },
        fromOpen: false,
        toOpen: false,
        rate:'1.000000',
        minerFee:'0.001123',
        minLimit:'1.000000',
        maxLimit:'10.000000',
        error: '',
      },
      icons: coinsIcons,
      icon404
    }
  }

  componentDidMount(){
    fetch('https://api.coincap.io/v2/assets?limit=2000')
    .then(res => {return res.json()})
    .then(result => {

        let coinIndex = {};
        let coinNameIndex = {};
        let nameKey = "";
        let coins = result.data.map((coin, i) => {
          coinIndex[coin.symbol] = i;
          nameKey = coin.name.toLowerCase().split(' ').join('-');
          coinNameIndex[nameKey] = i;
          coin['blink'] = 'none';
          return coin;
        });

        this.setState({
          isLoaded : true,
          coinIndex,
          coinNameIndex,
          coins
        });

        console.log('opening socket...');
        socket.open();

        console.log('listening socket...');
        socket.on('trades', stream => {
           var symbol = stream.coin;
           var index = coinIndex[symbol];
           if(typeof coins[index] !== 'undefined' && coins[index].hasOwnProperty('priceUsd')){
             coins[index]['priceUsd'] = stream.msg.price;
             coins[index]['marketCapUsd'] = stream.msg.mktcap;
             coins[index]['vwap24Hr'] = stream.msg.vwapData;
             coins[index]['supply'] = stream.msg.supply;
             //coins[index]['volumeUsd24Hr'] = stream.msg.volume;
             var perc_bef = parseFloat(coins[index]['changePercent24Hr']);
             var perc_now = parseFloat(stream.msg.cap24hrChange);
             coins[index]['blink'] = (perc_now >= perc_bef) ? 'do-green' : 'do-red';
             coins[index]['changePercent24Hr'] = isNaN(perc_now) ? coins[index]['changePercent24Hr'] : perc_now;
           }
        });

        webSocket.onmessage = function (msg) {
          let wsData = JSON.parse(msg.data);
          let nameKey = wsData.base;
          let price = parseFloat(wsData.priceUsd);
          if(coinNameIndex.hasOwnProperty(nameKey) && price > 0){
            let index = coinNameIndex[nameKey];
            let price_bef = parseFloat(coins[index].priceUsd);
            let price_now = price;
            coins[index]['blink'] = (price_now >= price_bef) ? 'do-green' : 'do-red';
            coins[index].priceUsd = price;
          }
        }

        checker = setInterval(() => {
          this.setState({coins});
          this.undoBlink();
        }, 3000);

      },
    error => {
      console.log('coincap fetch error', error);
    });
  }

  componentWillUnmount(){
    socket.close();
    webSocket.close();
    clearInterval(checker);
    console.log('closing socket...');
  }

  undoBlink = () => {
    var coins = this.state.coins.map(coin => {
      coin['blink'] = 'none';
      return coin;
    });
    setTimeout(() => {
      this.setState({coins});
    }, 1000);
  }

  render() {

    const cols = [
      {
        Header : 'Rank',
        accessor : 'rank',
        width: 75
      },
      {
        Header: 'Name',
        accessor: 'name',
        width: 250
      },
      {
        Header : 'Price (USD)',
        accessor : 'priceUsd'
      },
      {
        Header : 'Market Cap (USD)',
        accessor : 'marketCapUsd'
      },
      {
        Header : 'VWAP (24Hr USD)',
        accessor : 'vwap24Hr'
      },
      {
        Header : 'Supply (BTC)',
        accessor : 'supply'
      },
      {
        Header : 'Volume (24Hr USD)',
        accessor : 'volumeUsd24Hr'
      },
      {
        Header : 'Change (24Hr)',
        accessor : 'changePercent24Hr',
        width : 75
      },
    ];

    if(!this.state.isLoaded){
      return <div>Loading...</div>;
    }else{

      let _coins = this.state.coins.map(coin => {
          let symbol = coin.symbol.toLowerCase();
          let change_num = (coin.changePercent24Hr) ? parseFloat(coin.changePercent24Hr).toFixed(2) : 0;
          let change = (coin.changePercent24Hr) ? change_num : 'unknown';
          let _coin = {
            'rank' : coin.rank,
            'symbol' : coin.symbol,
            'name': (
              <Row>
                <Col md="3">
                  <img src={this.state.icons[symbol] ? this.state.icons[symbol] : this.state.icon404} width="40"/>
                </Col>
                <Col md="9">
                  {coin.symbol}
                  <br/>
                  <small>{coin.name}</small>
                </Col>
              </Row>
            ),
            'priceUsd' : numShort(coin.priceUsd, this.props.twMode),
            'marketCapUsd' : numShort(coin.marketCapUsd, this.props.twMode),
            'vwap24Hr' : numShort(coin.vwap24Hr, this.props.twMode),
            'supply' : numShort(coin.supply, this.props.twMode),
            'volumeUsd24Hr' : numShort(coin.volumeUsd24Hr, this.props.twMode),
            'changePercent24Hr' : ( <span style={{color: (change_num > 0) ? 'green' : 'red'}}>{`${change}%`}</span>),
            'blink' : coin.blink
          };
          return _coin;
        });

      let {fromCoin, toCoin} = this.state.swapData;

      return (
        <>
          <div className="content">
            <Row>
              <Col md="12">
                <Card className="card-plain">
                  <CardBody>
                    <ReactTable
                      data={_coins}
                      columns={cols}
                      filterable = {false}
                      getTrProps={(state, rowInfo, column) => {
                        return {
                          className : rowInfo.original.blink
                        };
                      }}
                    />
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </div>
          <Footer fluid />
        </>
      );
    }

  }

}

export default Tables;
