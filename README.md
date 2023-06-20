# thirdevent

NFT を活用した、イベント・勉強会運営プラットフォーム

## DEMO

- URL: <https://thirdevent.vercel.app/>
- 準備
  - MetaMask のインストール
  - MATIC(テストネット）の取得
    - <https://faucet.polygon.technology/>
    - <https://mumbaifaucet.com/>
  - サンプル画像
    - <https://fejolmilwpjvcsdeijti.supabase.co/storage/v1/object/public/sample_images/sample_images.zip>
    - 上記の URL から、グループ作成、イベント作成等で必要なサンプル画像をダウンロードが可能

### 動作確認

#### 全ユーザー共通

- 右上のログインボタンをクリックし、MetaMask の署名の上ログイン
- ハンバーガーメニューからログアウト

#### イベントオーナー

- グループ作成(要 MATIC)
  - イベント運営するためのグループを作成
  - ハンバーガーメニューから `グループ作成` をクリックする
  - グループ名、画像を設定して、グループを作成する
- イベント作成(要 MATIC)
  - グループを選択、イベント名、説明、画像を設定して、イベントを作成する
- チケットの追加(要 MATIC)
  - イベント詳細ページで、+ボタンをクリックし、チケットを追加する
  - チケット名、料金(MATIC）、定員、参加者タイプ、購入条件の要否、画像を設定する
    - 参加者タイプは Listener（一般参加者）か Speaker（登壇者）を選ぶ
    - 購入条件
      - なしの場合: 誰でも購入可能な状態
      - ありの場合: 条件の種類を選ぶ（Allowlist, Code, NFT）
        - Allowlist: 購入できるウォレットアドレスを指定できる。カンマ区切りで入力する。
          - 入力例
          - `0x299aC31535F69cAdA4158d3C50660eB03095d57E,0xC274Db247360D9aA845E7F45775cB089B4622Ffe`
        - Code: 購入の際に、クーポンコードや合言葉などの入力を条件にできる。
          - 入力例
          - `thirdevent2023`
        - NFT: 特定の NFT を保有していることを条件にできる。カンマ区切りで入力する。（現在は Mumbai のみ対応）
          - 入力例
          - `0x750dc4efa142f04a1ab6b5cd93dd54ff4db1f779,0x9f9ff88a45f2e73096a044779395003210701cd9`
- QR コードの発行
  - 参加受付のための QR コードを発行する。この QR を参加者が読み取ることで、チケット NFT が転送不可の「参加証明 SBT」としてブロックチェーンに刻まれる
  - イベント詳細ページで、イベント管理ボタンをクリック（グループメンバーのウォレットでログインが必要）
  - QR コードの発行で、QR の読み取り期限を設定し発行する
- 売上分配の設定
  - 売上分配設定をしていない場合、チケット購入された瞬間に料金の 99%が `グループコントラクト` に自動送金される
    - グループ詳細ページから、任意のタイミングで指定のアドレスに引き出しをすることができる
  - 売上分配を設定している場合、チケット購入された瞬間に料金の 99%が `Splitコントラクト` に自動送金される
    - **Split コントラクトはイベントごとに設定できるため、イベントごとの売上分配を実現できる**
    - Split コントラクトは thirdweb で作成する
    - 作成した Split コントラクトのアドレスを、イベント管理ページで設定する（要 MATIC)
    - 最終的に引き出す際に、Split コントラクト作成時に設定した割合に応じて、MATIC が自動送金される

#### イベント参加者

- チケットの購入(要 MATIC)
  - 欲しいチケットの購入ボタンをクリック
    - 購入完了後、OpenSea でチケット NFT が発行されていることを確認
- イベントの参加確定(要 MATIC)
  - イベントオーナーが発行した QR コードを期限内に読み取り、Claim することでチケット NFT を SBT にすることができる
