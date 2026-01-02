# Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the Resume Builder & Auto-Sender application.

## Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured to access your cluster
- NGINX Ingress Controller installed
- cert-manager installed (for TLS certificates)
- Metrics Server installed (for HPA)

## Directory Structure

```
k8s/
├── namespace.yaml           # Namespace definition
├── kustomization.yaml       # Kustomize configuration
├── api/                     # API service manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── serviceaccount.yaml
│   ├── hpa.yaml
│   └── pdb.yaml
├── worker/                  # Worker service manifests
│   ├── deployment.yaml
│   ├── serviceaccount.yaml
│   ├── hpa.yaml
│   └── pdb.yaml
├── frontend/                # Frontend service manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── serviceaccount.yaml
│   └── pdb.yaml
├── config/                  # ConfigMaps and resource limits
│   ├── api-configmap.yaml
│   ├── worker-configmap.yaml
│   ├── resource-quota.yaml
│   └── limit-range.yaml
├── secrets/                 # Secret templates
│   ├── api-secrets.yaml
│   └── worker-secrets.yaml
└── networking/              # Ingress and network policies
    ├── ingress.yaml
    ├── network-policy-default.yaml
    ├── network-policy-api.yaml
    ├── network-policy-worker.yaml
    └── network-policy-frontend.yaml
```

## Deployment

### 1. Update Secrets

Before deploying, update the secret files with actual values:

```bash
# Edit secrets with your actual credentials
vim k8s/secrets/api-secrets.yaml
vim k8s/secrets/worker-secrets.yaml
```

**Important**: In production, use a proper secret management solution like:
- External Secrets Operator
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

### 2. Update Ingress Hosts

Edit `k8s/networking/ingress.yaml` to use your actual domain names:

```yaml
spec:
  tls:
    - hosts:
        - your-domain.com
        - api.your-domain.com
```

### 3. Build and Push Docker Images

```bash
# Build API image
cd resume-builder-api
docker build -t your-registry/resume-builder-api:latest .
docker push your-registry/resume-builder-api:latest

# Build Worker image
docker build -t your-registry/resume-builder-worker:latest -f Dockerfile.worker .
docker push your-registry/resume-builder-worker:latest

# Build Frontend image
cd ../resume-builder-frontend
docker build -t your-registry/resume-builder-frontend:latest .
docker push your-registry/resume-builder-frontend:latest
```

### 4. Update Image References

Update the image references in deployment files to point to your registry.

### 5. Deploy with Kustomize

```bash
# Preview the deployment
kubectl kustomize k8s/

# Apply the deployment
kubectl apply -k k8s/

# Or apply individual files
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/config/
kubectl apply -f k8s/secrets/
kubectl apply -f k8s/api/
kubectl apply -f k8s/worker/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/networking/
```

## Verification

```bash
# Check namespace
kubectl get ns resume-builder

# Check all resources
kubectl get all -n resume-builder

# Check pods status
kubectl get pods -n resume-builder -w

# Check HPA status
kubectl get hpa -n resume-builder

# Check ingress
kubectl get ingress -n resume-builder

# View logs
kubectl logs -n resume-builder -l app=api -f
kubectl logs -n resume-builder -l app=worker -f
```

## Scaling

The application uses Horizontal Pod Autoscaler (HPA) for automatic scaling based on CPU and memory utilization.

Manual scaling:
```bash
# Scale API
kubectl scale deployment api -n resume-builder --replicas=5

# Scale Worker
kubectl scale deployment worker -n resume-builder --replicas=4
```

## Troubleshooting

### Check pod events
```bash
kubectl describe pod <pod-name> -n resume-builder
```

### Check resource usage
```bash
kubectl top pods -n resume-builder
```

### Check network policies
```bash
kubectl get networkpolicies -n resume-builder
```

### Debug connectivity
```bash
kubectl run debug --rm -it --image=busybox -n resume-builder -- sh
# Then test connectivity
wget -qO- http://api:3000/health
```

## Cleanup

```bash
kubectl delete -k k8s/
# Or
kubectl delete ns resume-builder
```
