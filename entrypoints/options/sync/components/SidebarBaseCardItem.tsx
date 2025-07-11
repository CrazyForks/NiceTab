import { useCallback, useMemo } from 'react';
import { theme, Flex, Card, Tooltip, Typography, Tag, Modal } from 'antd';
import {
  SettingOutlined,
  SyncOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { SyncType } from '~/entrypoints/types';
import { classNames } from '~/entrypoints/common/utils';
import { useIntlUtls } from '~/entrypoints/common/hooks/global';
import { syncTypeMap } from '~/entrypoints/common/constants';
import type { RemoteOptionProps, BaseCardItemProps } from '../types';
import { StyledCardTitle, StyledResult, StyledLabel, StyledText } from '../Sync.styled';
import { useSyncResult } from '../hooks/syncResult';

export default function BaseCardItem<T extends { label: string } = RemoteOptionProps>({
  option,
  isActive,
  syncStatus,
  syncResult,
  cardTitle,
  onAction,
  validator = () => true,
}: BaseCardItemProps<T>) {
  const [modal, modalContextHolder] = Modal.useModal();
  const { token } = theme.useToken();
  const { $fmt } = useIntlUtls();
  const lastSyncInfo = useMemo(() => {
    return syncResult?.[0] || {};
  }, [syncResult]);

  const { syncTypeText, syncTypeTipText, variantInfo } = useSyncResult(lastSyncInfo);
  const actionConfirmTextMap: Partial<Record<SyncType, string>> = useMemo(() => {
    return {
      [syncTypeMap.MANUAL_PULL_FORCE]: $fmt('sync.actionTip.manualPullForce'),
      [syncTypeMap.MANUAL_PUSH_FORCE]: $fmt('sync.actionTip.manualPushForce'),
    };
  }, [$fmt]);

  // 操作确认
  const handleConfirm = async (actionType: SyncType) => {
    if (!validator?.(option)) return;

    const modalConfig = {
      title: $fmt('sync.actionTip'),
      content: actionConfirmTextMap[actionType],
    };
    const confirmed = await modal.confirm(modalConfig);
    if (confirmed) onAction?.(option, actionType);
  };
  // 合并推送
  const handlePushMerge = useCallback(() => {
    if (!validator?.(option)) return;

    onAction?.(option, syncTypeMap['MANUAL_PUSH_MERGE']);
  }, [option, onAction]);

  const defaultCardTitle = useMemo(() => {
    return (
      <StyledCardTitle>
        <div className="card-title">{option.label}</div>
        {syncStatus === 'syncing' && (
          <Tag icon={<SyncOutlined spin />} color="processing">
            {$fmt('sync.syncing')}
          </Tag>
        )}
      </StyledCardTitle>
    );
  }, [option, syncStatus, $fmt]);

  const description = useMemo(() => {
    return (
      <Flex vertical gap={6}>
        <Typography.Text type="secondary">
          <StyledLabel>{$fmt('sync.lastSyncTime')}: </StyledLabel>
          {lastSyncInfo?.syncTime || $fmt('common.noData')}
        </Typography.Text>
        {lastSyncInfo?.syncTime && lastSyncInfo?.syncType && (
          <>
            <Typography.Text type="secondary">
              <StyledLabel>{$fmt('sync.lastSyncType')}: </StyledLabel>
              <Tooltip
                color={token.colorBgElevated}
                destroyTooltipOnHide
                title={<Typography.Text>{syncTypeTipText}</Typography.Text>}
              >
                <Tag color="blue">{syncTypeText}</Tag>
              </Tooltip>
            </Typography.Text>
            <Typography.Text type="secondary">
              <StyledLabel>{$fmt('sync.lastSyncResult')}: </StyledLabel>
              <Tag color={variantInfo.variant}>{variantInfo.text}</Tag>
            </Typography.Text>
            {lastSyncInfo.reason && (
              <Typography.Text type="danger">
                <StyledResult>
                  <StyledLabel>{$fmt('common.failedReason')}: </StyledLabel>
                  <StyledText title={lastSyncInfo.reason}>
                    {lastSyncInfo.reason}
                  </StyledText>
                </StyledResult>
              </Typography.Text>
            )}
          </>
        )}
      </Flex>
    );
  }, [lastSyncInfo, syncTypeText, syncTypeTipText, variantInfo, $fmt]);

  const actions = useMemo(() => {
    return [
      <Tooltip
        color={token.colorBgElevated}
        destroyTooltipOnHide
        title={<Typography.Text>{$fmt('common.settings')}</Typography.Text>}
      >
        <div className="icon-btn-wrapper" onClick={() => onAction?.(option, 'setting')}>
          <SettingOutlined key="setting" />
        </div>
      </Tooltip>,
      <Tooltip
        color={token.colorBgElevated}
        destroyTooltipOnHide
        title={<Typography.Text>{$fmt('sync.tip.manualPullForce')}</Typography.Text>}
      >
        <div
          className="icon-btn-wrapper"
          onClick={() => handleConfirm(syncTypeMap['MANUAL_PULL_FORCE'])}
        >
          <CloudDownloadOutlined key={syncTypeMap['MANUAL_PULL_FORCE']} />
        </div>
      </Tooltip>,
      <Tooltip
        color={token.colorBgElevated}
        destroyTooltipOnHide
        title={<Typography.Text>{$fmt('sync.tip.manualPushMerge')}</Typography.Text>}
      >
        <div className="icon-btn-wrapper" onClick={handlePushMerge}>
          <SyncOutlined key={syncTypeMap['MANUAL_PUSH_MERGE']} />
        </div>
      </Tooltip>,
      <Tooltip
        color={token.colorBgElevated}
        destroyTooltipOnHide
        title={<Typography.Text>{$fmt('sync.tip.manualPushForce')}</Typography.Text>}
      >
        <div
          className="icon-btn-wrapper"
          onClick={() => handleConfirm(syncTypeMap['MANUAL_PUSH_FORCE'])}
        >
          <CloudUploadOutlined key={syncTypeMap['MANUAL_PUSH_FORCE']} />
        </div>
      </Tooltip>,
      <Tooltip
        color={token.colorBgElevated}
        destroyTooltipOnHide
        title={<Typography.Text>{$fmt('sync.tip.resetStatus')}</Typography.Text>}
      >
        <div
          className="icon-btn-wrapper"
          onClick={() => onAction?.(option, 'resetStatus')}
        >
          <ReloadOutlined />
        </div>
      </Tooltip>,
    ];
  }, [option, onAction, handlePushMerge, $fmt]);

  return (
    <>
      {modalContextHolder}
      <Card
        className={classNames('card-item', isActive && 'active')}
        hoverable
        classNames={{
          actions: 'card-actions',
        }}
        onClick={() => onAction?.(option, 'select')}
        actions={actions}
      >
        <Card.Meta title={cardTitle || defaultCardTitle} description={description} />
      </Card>
    </>
  );
}
