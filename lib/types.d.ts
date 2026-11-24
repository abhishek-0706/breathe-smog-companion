export type Commute = "Car" | "Public transit" | "Work from home";
export type Budget = "No-cost first" | "Flexible";
export interface HouseholdProfile {
  city: string;
  sensitive: boolean;
  commute: Commute;
  distance: number;
  budget: Budget;
  purifier: boolean;
}
export interface AirCurrent {
  time: string;
  us_aqi: number;
  pm2_5: number | null;
  pm10: number | null;
  nitrogen_dioxide: number | null;
  ozone: number | null;
}
export interface AirSnapshot {
  current: AirCurrent;
  hourly: { time: string[]; us_aqi: number[] };
  stale: boolean;
  modeledAt: string;
  fetchedAt: string;
  timezone: string;
  utcOffsetSeconds: number;
  place: string;
  source: string;
  latitude: number;
  longitude: number;
}
export interface Routine {
  id: string;
  icon: string;
  time: string;
  title: string;
  body: string;
  impact: string;
  tag: string;
}
export interface GuidedContext {
  p: HouseholdProfile;
  q: string;
  high: boolean;
  unknown: string;
  air: string;
  distance: number | null;
}
export interface TopicRule {
  matches: (question: string) => boolean;
  reply: (context: GuidedContext) => string;
}
export interface SafetyRule {
  id: string;
  matches: (question: string) => boolean;
  answer: string;
}
export interface ViewState {
  profile: HouseholdProfile;
  air: AirSnapshot | null;
  airError: string;
  busy: boolean;
  completed: string[];
  pledges: string[];
}
export interface InfoState {
  air: AirSnapshot | null;
  aiEnabled: boolean;
}
export type ResponseMode =
  "generative" | "reference-guidance" | "safety-guidance";
export interface ChatDisplayReply {
  answer: string;
  mode: ResponseMode;
}
export type ProviderName = "gemini" | "openai";
export interface ChatReply extends ChatDisplayReply {
  basis?: "curated-public-health";
  provider?: ProviderName;
  model?: string;
  modelVersion?: string | null;
  fallbackUsed?: boolean;
}
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface ChatInput {
  question: string;
  profile?: unknown;
  history?: unknown;
}
export type Environment = Record<string, string | undefined>;
export type PlatformRequest = Request & { readonly cf?: unknown };
export interface RouteContext {
  request: PlatformRequest;
  url: URL;
  env: Environment;
  deadline: number;
}
export interface AiConfig {
  provider: ProviderName;
  model: string;
  key: string;
}
export interface AirObservation {
  kind: string;
  source: string;
  modeledAt: string;
  timezone: string;
  stale: boolean;
}
export interface ChatContext {
  profile: HouseholdProfile;
  aqi: number | null;
  input: ChatInput;
  deadline: number;
  airObservation: AirObservation | null;
}
export interface ProviderTurn {
  context: string;
  previous: ChatMessage[];
  question: string;
  deadline: number;
}
export interface ProviderAttempt {
  response: Response | null;
  answer: string;
  model: string;
  modelVersion: string | null;
  failure?: "timeout" | "connection";
}
export interface ProviderResult extends ProviderAttempt {
  attemptedModels: string[];
  modelDiscoveryStatus: number | null;
  availableTextModels: string[];
  configuredModelListed: boolean | null;
}
export interface ModelDiscovery {
  status: number | null;
  model: string | null;
  availableTextModels?: string[];
  configuredModelListed?: boolean | null;
}
export interface ForecastPoint {
  time: string;
  value: number;
  at: number;
}
