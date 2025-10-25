---
sidebar_position: 3
---

# Kubernetes Deployment

Deploy Imagor Studio on Kubernetes for production-scale deployments.

## Prerequisites

- Kubernetes cluster (1.19+)
- kubectl configured
- PostgreSQL database (recommended)
- S3-compatible storage (optional)

## Basic Deployment

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: imagor-studio
```

### Database Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-secret
  namespace: imagor-studio
type: Opaque
stringData:
  url: postgres://user:password@postgres:5432/imagor_studio
```

### Migration Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: imagor-studio-migrate
  namespace: imagor-studio
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: shumc/imagor-studio:latest
          command: ["imagor-studio-migrate", "--migrate-command=up"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-secret
                  key: url
      restartPolicy: OnFailure
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: imagor-studio
  namespace: imagor-studio
spec:
  replicas: 3
  selector:
    matchLabels:
      app: imagor-studio
  template:
    metadata:
      labels:
        app: imagor-studio
    spec:
      # Security context for proper file permissions
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      containers:
        - name: imagor-studio
          image: shumc/imagor-studio:latest
          ports:
            - containerPort: 8000
              name: http
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-secret
                  key: url
            - name: PORT
              value: "8000"
            # User/Group configuration (should match securityContext)
            - name: PUID
              value: "1000"
            - name: PGID
              value: "1000"
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: imagor-studio
  namespace: imagor-studio
spec:
  selector:
    app: imagor-studio
  ports:
    - port: 80
      targetPort: 8000
      name: http
  type: ClusterIP
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: imagor-studio
  namespace: imagor-studio
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - imagor.example.com
      secretName: imagor-studio-tls
  rules:
    - host: imagor.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: imagor-studio
                port:
                  number: 80
```

## Deploy

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Create secrets
kubectl apply -f secrets.yaml

# Run migrations
kubectl apply -f migration-job.yaml
kubectl wait --for=condition=complete job/imagor-studio-migrate -n imagor-studio

# Deploy application
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

## With PostgreSQL

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: imagor-studio
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: imagor_studio
            - name: POSTGRES_USER
              value: imagor
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

## Scaling

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: imagor-studio
  namespace: imagor-studio
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: imagor-studio
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Monitoring

### ServiceMonitor (Prometheus)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: imagor-studio
  namespace: imagor-studio
spec:
  selector:
    matchLabels:
      app: imagor-studio
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

## Permission Management

### Security Context Configuration

The deployment example above includes proper security context configuration to avoid permission issues:

```yaml
securityContext:
  runAsUser: 1000 # User ID to run containers
  runAsGroup: 1000 # Group ID to run containers
  fsGroup: 1000 # Group ID for volume ownership
```

### Environment Variables

The PUID/PGID environment variables should match your security context:

```yaml
env:
  - name: PUID
    value: "1000" # Should match runAsUser
  - name: PGID
    value: "1000" # Should match runAsGroup
```

### Benefits

- **Resolves k3s permission issues**: No more `nobody:nogroup` ownership problems
- **Proper file ownership**: Database and data files owned by specified user/group
- **Security compliance**: Follows Kubernetes security best practices
- **No permission workarounds**: Eliminates need for overly permissive directory permissions

## Best Practices

1. **Use StatefulSets for databases**
2. **Configure resource limits**
3. **Set up health checks**
4. **Use secrets for sensitive data**
5. **Enable autoscaling**
6. **Configure ingress with TLS**
7. **Set up monitoring and logging**
8. **Use persistent volumes for data**
9. **Configure proper security contexts**

## Next Steps

- [Migration Guide](./migration) - Database migrations
- [Configuration](../configuration/overview) - Configure settings
- [Security](../configuration/security) - Security best practices
