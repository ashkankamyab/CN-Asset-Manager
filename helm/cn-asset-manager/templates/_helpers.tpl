{{/*
Fullname: release-name truncated to 63 chars.
*/}}
{{- define "cn-asset-manager.fullname" -}}
{{- if .Release.Name -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Chart label value.
*/}}
{{- define "cn-asset-manager.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels.
*/}}
{{- define "cn-asset-manager.labels" -}}
helm.sh/chart: {{ include "cn-asset-manager.chart" . }}
{{ include "cn-asset-manager.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels.
*/}}
{{- define "cn-asset-manager.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Construct DATABASE_URL from values.
*/}}
{{- define "cn-asset-manager.databaseUrl" -}}
{{- if eq .Values.database.type "sqlite" -}}
sqlite:////app/data/db.sqlite3
{{- else if eq .Values.database.type "postgres" -}}
  {{- if .Values.database.internal -}}
postgres://{{ .Values.postgresql.auth.username }}:{{ .Values.postgresql.auth.password }}@{{ include "cn-asset-manager.fullname" . }}-postgresql:5432/{{ .Values.postgresql.auth.database }}
  {{- else -}}
postgres://{{ .Values.database.external.user }}:{{ .Values.database.external.password }}@{{ .Values.database.external.host }}:{{ .Values.database.external.port | default "5432" }}/{{ .Values.database.external.name }}
  {{- end -}}
{{- else if eq .Values.database.type "mysql" -}}
  {{- if .Values.database.internal -}}
mysql://{{ .Values.mysql.auth.username }}:{{ .Values.mysql.auth.password }}@{{ include "cn-asset-manager.fullname" . }}-mysql:3306/{{ .Values.mysql.auth.database }}
  {{- else -}}
mysql://{{ .Values.database.external.user }}:{{ .Values.database.external.password }}@{{ .Values.database.external.host }}:{{ .Values.database.external.port | default "3306" }}/{{ .Values.database.external.name }}
  {{- end -}}
{{- end -}}
{{- end -}}

{{/*
Construct CELERY_BROKER_URL from values.
*/}}
{{- define "cn-asset-manager.celeryBrokerUrl" -}}
{{- if .Values.redis.internal -}}
redis://{{ include "cn-asset-manager.fullname" . }}-redis-master:6379/0
{{- else -}}
{{ .Values.redis.external.url }}
{{- end -}}
{{- end -}}
