// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * JPYY/YTT 定数積 AMM（x × y = k）
 *
 * YTT 価格 = jpyyReserve / yttReserve（¥/YTT）
 *
 * setReserves はデモ専用。直接価格設定と k 維持価格調整のどちらにも使用する。
 * k 維持の計算（price-adjust）はバックエンドが担い、結果を渡す。
 */
contract AMM is Ownable {
    IERC20 public immutable jpyy;
    IERC20 public immutable ytt;

    uint256 public jpyyReserve;
    uint256 public yttReserve;

    event Swap(
        address indexed sender,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOut,
        uint256 newJpyyReserve,
        uint256 newYttReserve
    );
    event LiquidityAdded(uint256 jpyyAmount, uint256 yttAmount);
    event ReservesSet(uint256 jpyyReserve, uint256 yttReserve);

    constructor(address _jpyy, address _ytt, address admin) Ownable(admin) {
        jpyy = IERC20(_jpyy);
        ytt  = IERC20(_ytt);
    }

    // ── スワップ（エージェントが呼び出す）──────────────────

    function swapJpyyForYtt(uint256 jpyyIn, uint256 minYttOut) external {
        require(jpyyIn > 0, "AMM: zero input");

        uint256 yttOut = getAmountOut(jpyyIn, jpyyReserve, yttReserve);
        require(yttOut >= minYttOut, "AMM: slippage exceeded");
        require(yttOut < yttReserve, "AMM: insufficient YTT reserve");

        jpyy.transferFrom(msg.sender, address(this), jpyyIn);
        ytt.transfer(msg.sender, yttOut);

        jpyyReserve += jpyyIn;
        yttReserve  -= yttOut;

        emit Swap(msg.sender, address(jpyy), jpyyIn, yttOut, jpyyReserve, yttReserve);
    }

    function swapYttForJpyy(uint256 yttIn, uint256 minJpyyOut) external {
        require(yttIn > 0, "AMM: zero input");

        uint256 jpyyOut = getAmountOut(yttIn, yttReserve, jpyyReserve);
        require(jpyyOut >= minJpyyOut, "AMM: slippage exceeded");
        require(jpyyOut < jpyyReserve, "AMM: insufficient JPYY reserve");

        ytt.transferFrom(msg.sender, address(this), yttIn);
        jpyy.transfer(msg.sender, jpyyOut);

        yttReserve  += yttIn;
        jpyyReserve -= jpyyOut;

        emit Swap(msg.sender, address(ytt), yttIn, jpyyOut, jpyyReserve, yttReserve);
    }

    // ── 価格計算 ────────────────────────────────────────────

    // amountOut = (amountIn × reserveOut) / (reserveIn + amountIn)
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "AMM: invalid reserves");
        return (amountIn * reserveOut) / (reserveIn + amountIn);
    }

    // YTT 現在価格（× 1e18 スケール）= jpyyReserve * 1e18 / yttReserve
    function getYttPrice() external view returns (uint256) {
        require(yttReserve > 0, "AMM: no YTT reserve");
        return (jpyyReserve * 1e18) / yttReserve;
    }

    function getReserves() external view returns (uint256 _jpyy, uint256 _ytt) {
        return (jpyyReserve, yttReserve);
    }

    // ── 管理者専用（管理ダッシュボードから呼び出す）─────────

    function addLiquidity(uint256 jpyyAmount, uint256 yttAmount) external onlyOwner {
        jpyy.transferFrom(msg.sender, address(this), jpyyAmount);
        ytt.transferFrom(msg.sender, address(this), yttAmount);
        jpyyReserve += jpyyAmount;
        yttReserve  += yttAmount;
        emit LiquidityAdded(jpyyAmount, yttAmount);
    }

    // 価格変更（直接設定 / price-adjust のどちらも使用）
    // k が変化するためデモ専用。本番では削除する。
    function setReserves(uint256 _jpyyReserve, uint256 _yttReserve) external onlyOwner {
        require(_jpyyReserve > 0 && _yttReserve > 0, "AMM: zero reserve");
        _adjustReserve(jpyy, jpyyReserve, _jpyyReserve);
        _adjustReserve(ytt,  yttReserve,  _yttReserve);
        jpyyReserve = _jpyyReserve;
        yttReserve  = _yttReserve;
        emit ReservesSet(_jpyyReserve, _yttReserve);
    }

    function _adjustReserve(IERC20 token, uint256 current, uint256 target) internal {
        if (target > current) {
            token.transferFrom(msg.sender, address(this), target - current);
        } else if (current > target) {
            token.transfer(msg.sender, current - target);
        }
    }
}
