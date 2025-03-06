export interface TuyaConfig {
  baseUrl: string;
  accessKey: string;
  secretKey: string;
  projectCode: string;
}

export interface DeviceStatus {
  code: string;
  value: any;
}

export interface TuyaDevice {
  id: string;
  name: string;
  online: boolean;
  status: DeviceStatus[];
  category: string;
  model: string;
  product_name: string;
  sub: boolean;
  time_zone: string;
  ip: string;
  active_time: number;
  create_time: number;
  update_time: number;
  uid: string;
  local_key: string;
  uuid: string;
}

export interface TuyaResponse<T> {
  result: T;
  success: boolean;
  t: number;
  tid: string;
}

export interface DevicesResponse {
  devices: TuyaDevice[];
  has_more: boolean;
  total: number;
}

export interface Command {
  code: string;
  value: any;
}

export interface TuyaGroup {
  group_id: string;
  group_name: string;
  product_id: string;
  product_name: string;
  space_id: string;
  create_time: number;
  update_time: number;
  device_num: number;
  status?: DeviceStatus[];
}

export interface GroupsResponse {
  list: TuyaGroup[];
  total: number;
  page_no: number;
  page_size: number;
}

export interface GroupProperties {
  [key: string]: any;
}
