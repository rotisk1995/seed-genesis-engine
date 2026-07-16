#include "SeedWorldDirector.h"
#include "SeedResident.h"

#include "Components/InstancedStaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/SkyLightComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/ExponentialHeightFog.h"
#include "Engine/SkyLight.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "ProceduralMeshComponent.h"

namespace
{
    constexpr float TerrainHalfExtent = 12000.f;
    constexpr int32 TerrainResolution = 160;

    UMaterialInstanceDynamic* Tint(UObject* Owner, const FLinearColor& Color)
    {
        UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
        UMaterialInstanceDynamic* Material = UMaterialInstanceDynamic::Create(Base, Owner);
        if (Material)
        {
            Material->SetVectorParameterValue(TEXT("Color"), Color);
            Material->SetScalarParameterValue(TEXT("Roughness"), .78f);
        }
        return Material;
    }

    UStaticMesh* Shape(const TCHAR* Path)
    {
        return LoadObject<UStaticMesh>(nullptr, Path);
    }
}

ASeedWorldDirector::ASeedWorldDirector()
    : Random(WorldSeed)
{
    PrimaryActorTick.bCanEverTick = true;
    SetActorTickEnabled(true);

    Terrain = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("LivingTerrain"));
    SetRootComponent(Terrain);
    Terrain->bUseAsyncCooking = true;
    Terrain->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    Trunks = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Trunks"));
    CanopyA = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("CanopyA"));
    CanopyB = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("CanopyB"));
    ResourceMarkers = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("ResourceMarkers"));
    HouseWalls = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("HouseWalls"));
    HouseRoofs = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("HouseRoofs"));

    TArray<USceneComponent*> Components = { Trunks, CanopyA, CanopyB, ResourceMarkers, HouseWalls, HouseRoofs };
    for (USceneComponent* Component : Components)
    {
        Component->SetupAttachment(Terrain);
    }

    Trunks->SetStaticMesh(Shape(TEXT("/Engine/BasicShapes/Cylinder.Cylinder")));
    CanopyA->SetStaticMesh(Shape(TEXT("/Engine/BasicShapes/Cone.Cone")));
    CanopyB->SetStaticMesh(Shape(TEXT("/Engine/BasicShapes/Sphere.Sphere")));
    ResourceMarkers->SetStaticMesh(Shape(TEXT("/Engine/BasicShapes/Sphere.Sphere")));
    HouseWalls->SetStaticMesh(Shape(TEXT("/Engine/BasicShapes/Cube.Cube")));
    HouseRoofs->SetStaticMesh(Shape(TEXT("/Engine/BasicShapes/Cube.Cube")));

    Trunks->SetMaterial(0, Tint(this, FLinearColor(.18f, .075f, .027f)));
    CanopyA->SetMaterial(0, Tint(this, FLinearColor(.045f, .24f, .12f)));
    CanopyB->SetMaterial(0, Tint(this, FLinearColor(.10f, .37f, .16f)));
    ResourceMarkers->SetMaterial(0, Tint(this, FLinearColor(.80f, .49f, .12f)));
    HouseWalls->SetMaterial(0, Tint(this, FLinearColor(.29f, .12f, .055f)));
    HouseRoofs->SetMaterial(0, Tint(this, FLinearColor(.13f, .045f, .035f)));
}

float ASeedWorldDirector::SiteHeight(float X, float Y) const
{
    const FVector2D Position(X / TerrainHalfExtent, Y / TerrainHalfExtent);
    const float Rolling = FMath::PerlinNoise2D(Position * 2.35f) * 360.f;
    const float Detail = FMath::PerlinNoise2D(Position * 10.0f + FVector2D(17.2f, -8.1f)) * 92.f;
    const float Mountain = FMath::Max(0.f, FMath::PerlinNoise2D(Position * .92f + FVector2D(4.5f, -2.0f))) * 720.f;
    const float River = FMath::Exp(-FMath::Square((Y + X * .37f + FMath::Sin(X / 1450.f) * 690.f) / 920.f)) * 420.f;
    const float Edge = FMath::Square(FMath::Max(FMath::Abs(Position.X), FMath::Abs(Position.Y)));
    return Rolling + Detail + Mountain - River - Edge * 300.f;
}

float ASeedWorldDirector::GetGroundHeight(float X, float Y) const
{
    return SiteHeight(FMath::Clamp(X, -TerrainHalfExtent, TerrainHalfExtent), FMath::Clamp(Y, -TerrainHalfExtent, TerrainHalfExtent));
}

void ASeedWorldDirector::BuildTerrain()
{
    TArray<FVector> Vertices;
    TArray<int32> Triangles;
    TArray<FVector> Normals;
    TArray<FVector2D> UVs;
    TArray<FLinearColor> Colors;
    TArray<FProcMeshTangent> Tangents;
    Vertices.Reserve((TerrainResolution + 1) * (TerrainResolution + 1));
    Normals.Reserve((TerrainResolution + 1) * (TerrainResolution + 1));

    for (int32 Row = 0; Row <= TerrainResolution; ++Row)
    {
        for (int32 Column = 0; Column <= TerrainResolution; ++Column)
        {
            const float X = FMath::Lerp(-TerrainHalfExtent, TerrainHalfExtent, float(Column) / TerrainResolution);
            const float Y = FMath::Lerp(-TerrainHalfExtent, TerrainHalfExtent, float(Row) / TerrainResolution);
            const float Height = SiteHeight(X, Y);
            const float Sample = 35.f;
            const float SlopeX = (SiteHeight(X + Sample, Y) - SiteHeight(X - Sample, Y)) / (2.f * Sample);
            const float SlopeY = (SiteHeight(X, Y + Sample) - SiteHeight(X, Y - Sample)) / (2.f * Sample);
            const float Fertility = FMath::Clamp(1.f - FMath::Abs(Height) / 1150.f - FMath::Abs(SlopeX + SlopeY) * .4f, .05f, 1.f);
            const float Mineral = FMath::Clamp(FMath::PerlinNoise2D(FVector2D(X, Y) / 2300.f) * .5f + .5f, 0.f, 1.f);

            Vertices.Add(FVector(X, Y, Height));
            Normals.Add(FVector(-SlopeX, -SlopeY, 1.f).GetSafeNormal());
            UVs.Add(FVector2D(float(Column) / TerrainResolution * 7.f, float(Row) / TerrainResolution * 7.f));
            Colors.Add(FLinearColor(.035f + Mineral * .10f, .09f + Fertility * .33f, .06f + Fertility * .14f, 1.f));
            Tangents.Add(FProcMeshTangent(1.f, 0.f, SlopeX));
        }
    }

    for (int32 Row = 0; Row < TerrainResolution; ++Row)
    {
        for (int32 Column = 0; Column < TerrainResolution; ++Column)
        {
            const int32 A = Row * (TerrainResolution + 1) + Column;
            const int32 B = A + 1;
            const int32 C = A + TerrainResolution + 1;
            const int32 D = C + 1;
            Triangles.Append({ A, C, B, B, C, D });
        }
    }

    Terrain->CreateMeshSection_LinearColor(0, Vertices, Triangles, Normals, UVs, Colors, Tangents, false);
    UMaterialInterface* VertexColorMaterial = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/EngineDebugMaterials/VertexColorMaterial.VertexColorMaterial"));
    Terrain->SetMaterial(0, VertexColorMaterial ? VertexColorMaterial : Tint(this, FLinearColor(.08f, .25f, .10f)));
}

void ASeedWorldDirector::AddTree(const FVector& Location, float Scale, int32 Variant)
{
    const FVector Grounded(Location.X, Location.Y, GetGroundHeight(Location.X, Location.Y));
    Trunks->AddInstance(FTransform(FRotator::ZeroRotator, Grounded + FVector(0.f, 0.f, 95.f * Scale), FVector(.18f * Scale, .18f * Scale, 1.2f * Scale)));
    const FTransform Crown(FRotator(0.f, float((Variant * 53) % 360), 0.f), Grounded + FVector(0.f, 0.f, 270.f * Scale), FVector(1.1f * Scale, 1.1f * Scale, 1.6f * Scale));
    (Variant % 2 ? CanopyA : CanopyB)->AddInstance(Crown);
}

void ASeedWorldDirector::BuildBiome()
{
    for (int32 Tree = 0; Tree < 720; ++Tree)
    {
        const float X = Random.FRandRange(-TerrainHalfExtent + 300.f, TerrainHalfExtent - 300.f);
        const float Y = Random.FRandRange(-TerrainHalfExtent + 300.f, TerrainHalfExtent - 300.f);
        const float Height = GetGroundHeight(X, Y);
        if (Height > 520.f || FMath::Abs(Y + X * .37f) < 900.f)
        {
            continue;
        }
        AddTree(FVector(X, Y, Height), Random.FRandRange(.55f, 1.45f), Tree);
    }

    for (int32 Resource = 0; Resource < 24; ++Resource)
    {
        const float X = Random.FRandRange(-9000.f, 9000.f);
        const float Y = Random.FRandRange(-7800.f, 7800.f);
        const FVector Site(X, Y, GetGroundHeight(X, Y));
        ResourceLocations.Add(Site);
        ResourceMarkers->AddInstance(FTransform(FRotator::ZeroRotator, Site + FVector(0.f, 0.f, 55.f), FVector(.45f, .45f, .45f)));
    }
}

void ASeedWorldDirector::AddHouse(int32 SettlementIndex, const FLinearColor& Pigment)
{
    if (!Settlements.IsValidIndex(SettlementIndex))
    {
        return;
    }
    FSeedSettlement& Settlement = Settlements[SettlementIndex];
    const int32 HouseSeed = SettlementIndex * 113 + Settlement.HouseCount * 47 + WorldSeed;
    FRandomStream HouseRandom(HouseSeed);
    const float Angle = HouseRandom.FRandRange(0.f, 360.f);
    const float Radius = 270.f + 125.f * Settlement.HouseCount + HouseRandom.FRandRange(-55.f, 55.f);
    const FVector Offset = FVector(FMath::Cos(FMath::DegreesToRadians(Angle)), FMath::Sin(FMath::DegreesToRadians(Angle)), 0.f) * Radius;
    const FVector Location = Settlement.Location + Offset + FVector(0.f, 0.f, GetGroundHeight(Settlement.Location.X + Offset.X, Settlement.Location.Y + Offset.Y));
    const float Width = HouseRandom.FRandRange(1.25f, 2.15f);
    const float Depth = HouseRandom.FRandRange(1.1f, 1.8f);
    const float Height = HouseRandom.FRandRange(1.0f, 1.65f);
    const float Yaw = HouseRandom.FRandRange(0.f, 360.f);

    HouseWalls->AddInstance(FTransform(FRotator(0.f, Yaw, 0.f), Location + FVector(0.f, 0.f, Height * 62.f), FVector(Width, Depth, Height)));
    HouseRoofs->AddInstance(FTransform(FRotator(27.f, Yaw, 0.f), Location + FVector(0.f, 0.f, Height * 155.f), FVector(Width * 1.14f, Depth * 1.18f, .22f)));
    HouseRoofs->AddInstance(FTransform(FRotator(-27.f, Yaw, 0.f), Location + FVector(0.f, 0.f, Height * 155.f), FVector(Width * 1.14f, Depth * 1.18f, .22f)));
    ++Settlement.HouseCount;
}

void ASeedWorldDirector::PopulateWorld()
{
    const TArray<FVector> Sites = {
        FVector(-5100.f, -3300.f, 0.f), FVector(-2450.f, 4100.f, 0.f), FVector(1700.f, -2900.f, 0.f),
        FVector(4800.f, 2500.f, 0.f), FVector(2600.f, 5900.f, 0.f), FVector(-6400.f, 2800.f, 0.f)
    };
    const TArray<FLinearColor> Cultures = {
        FLinearColor(.18f, .67f, .92f), FLinearColor(.95f, .31f, .38f), FLinearColor(.93f, .67f, .16f),
        FLinearColor(.46f, .29f, .96f), FLinearColor(.16f, .86f, .52f), FLinearColor(.94f, .21f, .74f)
    };

    for (int32 Index = 0; Index < Sites.Num(); ++Index)
    {
        FSeedSettlement Settlement;
        Settlement.Location = Sites[Index];
        Settlement.Location.Z = GetGroundHeight(Settlement.Location.X, Settlement.Location.Y);
        Settlement.Culture = Cultures[Index];
        Settlement.NextHouseAt = 5 + Index;
        Settlements.Add(Settlement);
        AddHouse(Index, Cultures[Index]);
    }

    const int32 ResidentCount = 64;
    for (int32 Index = 0; Index < ResidentCount; ++Index)
    {
        const int32 SettlementIndex = Index % Settlements.Num();
        const int32 ResourceIndex = Index % ResourceLocations.Num();
        const FVector Origin = GetSettlementLocation(SettlementIndex) + FVector(Random.FRandRange(-180.f, 180.f), Random.FRandRange(-180.f, 180.f), 16.f);
        ASeedResident* Resident = GetWorld()->SpawnActor<ASeedResident>(ASeedResident::StaticClass(), Origin, FRotator(0.f, Random.FRandRange(0.f, 360.f), 0.f));
        if (Resident)
        {
            Resident->Initialise(this, SettlementIndex, ResourceIndex, WorldSeed + Index * 991, Settlements[SettlementIndex].Culture);
            Residents.Add(Resident);
        }
    }
}

void ASeedWorldDirector::BeginPlay()
{
    Super::BeginPlay();
    BuildTerrain();
    BuildBiome();
    PopulateWorld();

    if (UWorld* World = GetWorld())
    {
        ADirectionalLight* Sun = World->SpawnActor<ADirectionalLight>();
        if (Sun)
        {
            Sun->SetActorRotation(FRotator(-42.f, -28.f, 0.f));
            Sun->GetLightComponent()->SetIntensity(6.5f);
        }
        ASkyLight* Sky = World->SpawnActor<ASkyLight>();
        if (Sky)
        {
            Sky->GetLightComponent()->SetIntensity(.7f);
        }
        AExponentialHeightFog* Fog = World->SpawnActor<AExponentialHeightFog>();
        if (Fog)
        {
            Fog->GetComponent()->SetFogDensity(.012f);
        }
    }
}

void ASeedWorldDirector::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    BuildPulse += DeltaSeconds;
    if (BuildPulse > 1.f)
    {
        BuildPulse = 0.f;
        for (int32 Index = 0; Index < Settlements.Num(); ++Index)
        {
            FSeedSettlement& Settlement = Settlements[Index];
            if (Settlement.Deliveries >= Settlement.NextHouseAt)
            {
                AddHouse(Index, Settlement.Culture);
                Settlement.NextHouseAt += 7 + Settlement.HouseCount * 2;
            }
        }
    }
}

FVector ASeedWorldDirector::GetSettlementLocation(int32 SettlementIndex) const
{
    return Settlements.IsValidIndex(SettlementIndex) ? Settlements[SettlementIndex].Location : FVector::ZeroVector;
}

FVector ASeedWorldDirector::GetResourceLocation(int32 ResourceIndex) const
{
    return ResourceLocations.IsValidIndex(ResourceIndex) ? ResourceLocations[ResourceIndex] : FVector::ZeroVector;
}

int32 ASeedWorldDirector::GetResourceCount() const
{
    return FMath::Max(1, ResourceLocations.Num());
}

void ASeedWorldDirector::ReceiveMaterial(int32 SettlementIndex, const FLinearColor& MaterialPigment)
{
    if (!Settlements.IsValidIndex(SettlementIndex))
    {
        return;
    }
    ++Settlements[SettlementIndex].Deliveries;
}
