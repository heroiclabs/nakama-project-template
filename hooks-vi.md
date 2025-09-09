# Nakama Server Hooks

## Giới thiệu

Hooks là tính năng của Nakama server runtime cho phép chạy code tùy chỉnh trước hoặc sau khi các sự kiện server xảy ra. Hooks giúp:
- Kiểm tra và xác thực dữ liệu đầu vào
- Tùy chỉnh logic xử lý
- Ghi log và theo dõi hoạt động
- Đảm bảo tính nhất quán của dữ liệu
- Tích hợp với hệ thống bên ngoài

## Các loại Hooks

### 1. Before Hooks

Thực thi trước khi sự kiện xảy ra. Có thể:
- Kiểm tra và thay đổi dữ liệu đầu vào
- Từ chối yêu cầu không hợp lệ
- Áp dụng logic tùy chỉnh

### 2. After Hooks

Thực thi sau khi sự kiện đã xảy ra. Sử dụng để:
- Ghi log hoạt động
- Cập nhật dữ liệu liên quan
- Gửi thông báo
- Đồng bộ với hệ thống bên ngoài

### 3. RPC Hooks

Đăng ký hàm có thể được gọi trực tiếp từ client.

### 4. Event Hooks

Xử lý các sự kiện đặc biệt trên server:
- Leaderboard reset
- Tournament end/reset
- Matchmaker matched
- Server shutdown
- Purchase notifications

## Danh sách đầy đủ các Before/After Hooks

### Standard Hooks

```typescript
// Xác thực và tài khoản
initializer.registerBeforeAuthenticateApple()
initializer.registerAfterAuthenticateApple()
initializer.registerBeforeAuthenticateCustom()
initializer.registerAfterAuthenticateCustom()
initializer.registerBeforeAuthenticateDevice()
initializer.registerAfterAuthenticateDevice()
initializer.registerBeforeAuthenticateEmail()
initializer.registerAfterAuthenticateEmail()
initializer.registerBeforeAuthenticateFacebook()
initializer.registerAfterAuthenticateFacebook()
initializer.registerBeforeAuthenticateFacebookInstantGame()
initializer.registerAfterAuthenticateFacebookInstantGame()
initializer.registerBeforeAuthenticateGameCenter()
initializer.registerAfterAuthenticateGameCenter()
initializer.registerBeforeAuthenticateGoogle()
initializer.registerAfterAuthenticateGoogle()
initializer.registerBeforeAuthenticateSteam()
initializer.registerAfterAuthenticateSteam()
initializer.registerBeforeListUserAccount()
initializer.registerAfterListUserAccount()
initializer.registerBeforeGetAccount()
initializer.registerAfterGetAccount()
initializer.registerBeforeUpdateAccount()
initializer.registerAfterUpdateAccount()
initializer.registerBeforeDeleteAccount()
initializer.registerAfterDeleteAccount()

// Bạn bè
initializer.registerBeforeAddFriends()
initializer.registerAfterAddFriends()
initializer.registerBeforeDeleteFriend()
initializer.registerAfterDeleteFriend()
initializer.registerBeforeBlockFriends()
initializer.registerAfterBlockFriends()
initializer.registerBeforeImportFacebookFriends()
initializer.registerAfterImportFacebookFriends()
initializer.registerBeforeListFriends()
initializer.registerAfterListFriends()

// Nhóm
initializer.registerBeforeCreateGroup()
initializer.registerAfterCreateGroup()
initializer.registerBeforeUpdateGroup()
initializer.registerAfterUpdateGroup()
initializer.registerBeforeDeleteGroup()
initializer.registerAfterDeleteGroup()
initializer.registerBeforeJoinGroup()
initializer.registerAfterJoinGroup()
initializer.registerBeforeLeaveGroup()
initializer.registerAfterLeaveGroup()
initializer.registerBeforeAddGroupUsers()
initializer.registerAfterAddGroupUsers()
initializer.registerBeforeBanGroupUsers()
initializer.registerAfterBanGroupUsers()
initializer.registerBeforePromoteGroupUsers()
initializer.registerAfterPromoteGroupUsers()

// Leaderboard và tournaments
initializer.registerBeforeListLeaderboardRecords()
initializer.registerAfterListLeaderboardRecords()
initializer.registerBeforeWriteLeaderboardRecord()
initializer.registerAfterWriteLeaderboardRecord()
initializer.registerBeforeListTournaments()
initializer.registerAfterListTournaments()
initializer.registerBeforeJoinTournament()
initializer.registerAfterJoinTournament()
initializer.registerBeforeWriteTournamentRecord()
initializer.registerAfterWriteTournamentRecord()

// Storage
initializer.registerBeforeReadStorageObjects()
initializer.registerAfterReadStorageObjects()
initializer.registerBeforeWriteStorageObjects()
initializer.registerAfterWriteStorageObjects()
initializer.registerBeforeDeleteStorageObjects()
initializer.registerAfterDeleteStorageObjects()

// Wallet
initializer.registerBeforeWalletUpdate()
initializer.registerAfterWalletUpdate()
initializer.registerBeforeWalletLedgerList()
initializer.registerAfterWalletLedgerList()
```

### Realtime Hooks

```typescript
// Kênh chat
initializer.registerRtBefore("ChannelJoin")
initializer.registerRtAfter("ChannelJoin")
initializer.registerRtBefore("ChannelLeave")
initializer.registerRtAfter("ChannelLeave")
initializer.registerRtBefore("ChannelMessageSend")
initializer.registerRtAfter("ChannelMessageSend")
initializer.registerRtBefore("ChannelMessageUpdate")
initializer.registerRtAfter("ChannelMessageUpdate")
initializer.registerRtBefore("ChannelMessageRemove")
initializer.registerRtAfter("ChannelMessageRemove")

// Match
initializer.registerRtBefore("MatchCreate")
initializer.registerRtAfter("MatchCreate")
initializer.registerRtBefore("MatchDataSend")
initializer.registerRtAfter("MatchDataSend")
initializer.registerRtBefore("MatchJoin")
initializer.registerRtAfter("MatchJoin")
initializer.registerRtBefore("MatchLeave")
initializer.registerRtAfter("MatchLeave")

// Matchmaker
initializer.registerRtBefore("MatchmakerAdd")
initializer.registerRtAfter("MatchmakerAdd")
initializer.registerRtBefore("MatchmakerRemove")
initializer.registerRtAfter("MatchmakerRemove")

// Party
initializer.registerRtBefore("PartyCreate")
initializer.registerRtAfter("PartyCreate")
initializer.registerRtBefore("PartyJoin")
initializer.registerRtAfter("PartyJoin")
initializer.registerRtBefore("PartyLeave")
initializer.registerRtAfter("PartyLeave")
initializer.registerRtBefore("PartyPromote")
initializer.registerRtAfter("PartyPromote")
initializer.registerRtBefore("PartyAccept")
initializer.registerRtAfter("PartyAccept")
initializer.registerRtBefore("PartyRemove")
initializer.registerRtAfter("PartyRemove")
initializer.registerRtBefore("PartyClose")
initializer.registerRtAfter("PartyClose")
initializer.registerRtBefore("PartyJoinRequestList")
initializer.registerRtAfter("PartyJoinRequestList")
initializer.registerRtBefore("PartyMatchmakerAdd")
initializer.registerRtAfter("PartyMatchmakerAdd")
initializer.registerRtBefore("PartyMatchmakerRemove")
initializer.registerRtAfter("PartyMatchmakerRemove")
initializer.registerRtBefore("PartyDataSend")
initializer.registerRtAfter("PartyDataSend")

// Status
initializer.registerRtBefore("StatusFollow")
initializer.registerRtAfter("StatusFollow")
initializer.registerRtBefore("StatusUnfollow")
initializer.registerRtAfter("StatusUnfollow")
initializer.registerRtBefore("StatusUpdate")
initializer.registerRtAfter("StatusUpdate")
```

### Event Hooks

```typescript
// Sự kiện khi leaderboard reset
initializer.registerLeaderboardReset()

// Sự kiện khi tournament reset hoặc kết thúc
initializer.registerTournamentReset()
initializer.registerTournamentEnd()

// Sự kiện khi matchmaker tạo match
initializer.registerMatchmakerMatched()

// Sự kiện khi server shutdown
initializer.registerShutdown()

// Sự kiện khi có purchase notification
initializer.registerPurchaseNotificationApple()
initializer.registerPurchaseNotificationGoogle()
initializer.registerSubscriptionNotificationApple()
initializer.registerSubscriptionNotificationGoogle()
```

## Ví dụ sử dụng hooks

### Before Hook Example

```typescript
// Kiểm tra quyền trước khi tạo group
function beforeCreateGroup(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: any) {
  // Kiểm tra xem người dùng có đủ quyền tạo group không
  const account = nk.accountGetId(ctx.userId);
  
  if (account.user.metadata.role !== 'admin') {
    // Từ chối yêu cầu nếu không phải admin
    logger.info(`User ${ctx.userId} không có quyền tạo group`);
    return null; // Trả về null để từ chối yêu cầu
  }
  
  // Cho phép tiếp tục xử lý
  return data;
}

// Đăng ký hook trong InitModule
initializer.registerBeforeCreateGroup(beforeCreateGroup);
```

### After Hook Example - Xử lý vấn đề nhất quán dữ liệu

```typescript
// Đảm bảo cập nhật nhận thưởng hàng ngày sau khi wallet đã được cập nhật
function afterWalletUpdate(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: any) {
  // Kiểm tra xem wallet update đến từ reward system không
  if (data.metadata && data.metadata.source === "daily_reward") {
    try {
      // Cập nhật thời gian nhận thưởng mới nhất
      const lastClaimTime = Math.floor(Date.now() / 1000);
      
      const writeObj: nkruntime.StorageWriteRequest = {
        collection: "reward",
        key: "daily",
        userId: ctx.userId!,
        value: { lastClaimUnix: lastClaimTime },
        permissionRead: 1,
        permissionWrite: 0,
      };
      
      // Ghi thời gian nhận thưởng mới
      nk.storageWrite([writeObj]);
      
      logger.info("Đã ghi nhận thời gian nhận thưởng cho user: " + ctx.userId);
    } catch (error) {
      logger.error("Không thể ghi nhận thời gian nhận thưởng: " + error);
      // Ghi log lỗi nhưng không ảnh hưởng đến kết quả wallet update
    }
  }
}

// Đăng ký hook trong InitModule
initializer.registerAfterWalletUpdate(afterWalletUpdate);
```

### RPC Hook Example

```typescript
function rpcGetRewardStatus(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  if (!ctx.userId) {
    throw Error("Không có user ID trong context");
  }

  // Đọc trạng thái phần thưởng
  const storageObjects = nk.storageRead([{
    collection: "reward",
    key: "daily",
    userId: ctx.userId
  }]);

  const now = Math.floor(Date.now() / 1000);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayTimestamp = Math.floor(startOfDay.getTime() / 1000);

  let response: any = {
    canClaimReward: true,
    lastClaimTime: 0,
    nextClaimTime: startOfDayTimestamp,
    timeUntilNextClaim: 0
  };

  if (storageObjects.length > 0) {
    const rewardData = storageObjects[0].value;
    response.lastClaimTime = rewardData.lastClaimUnix;
    
    // Kiểm tra xem đã nhận thưởng hôm nay chưa
    if (rewardData.lastClaimUnix >= startOfDayTimestamp) {
      response.canClaimReward = false;
      
      // Tính thời gian đến ngày mai
      const tomorrow = new Date(startOfDay);
      tomorrow.setDate(tomorrow.getDate() + 1);
      response.nextClaimTime = Math.floor(tomorrow.getTime() / 1000);
      response.timeUntilNextClaim = response.nextClaimTime - now;
    }
  }

  return JSON.stringify(response);
}

// Đăng ký RPC hook trong InitModule
initializer.registerRpc("get_reward_status", rpcGetRewardStatus);
```

## Best Practices

1. **Xử lý lỗi đúng cách**
   - Luôn bắt và xử lý các ngoại lệ
   - Ghi log đầy đủ thông tin lỗi
   - Trả về thông báo lỗi có ý nghĩa

2. **Đảm bảo tính nhất quán dữ liệu**
   - Sử dụng after hooks để đảm bảo các thao tác liên quan được thực hiện sau khi hoạt động chính thành công
   - Xem xét thứ tự thực hiện các thao tác

3. **Hiệu suất**
   - Tránh thực hiện các thao tác tốn nhiều tài nguyên trong hooks
   - Sử dụng afterHook thay vì beforeHook cho các hoạt động không liên quan đến xác thực

4. **Bảo mật**
   - Sử dụng beforeHooks để xác thực và kiểm tra quyền
   - Không tin tưởng dữ liệu từ client

5. **Ghi log**
   - Ghi log đầy đủ cho mục đích debugging
   - Sử dụng các mức log phù hợp (debug, info, warn, error)

## Tài liệu tham khảo

- [Nakama Server Documentation - Hooks](https://heroiclabs.com/docs/nakama/server-framework/introduction/hooks/)
- [Using Hooks Guide](https://heroiclabs.com/docs/nakama/guides/server-framework/using-hooks/)
- [TypeScript Function Reference](https://heroiclabs.com/docs/nakama/server-framework/typescript-runtime/function-reference/) 